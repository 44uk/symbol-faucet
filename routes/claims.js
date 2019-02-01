const config = require('config');
const express = require('express');
const request = require('request');
const jsJoda = require('js-joda');
const nem = require('nem2-sdk');
const rx = require('rxjs');
const op = require('rxjs/operators');
const qs = require('querystring');
const _ = require('lodash');
_.mixin({
  isBlank: val => {
    return (_.isEmpty(val) && !_.isNumber(val)) || _.isNaN(val);
  }
});

const GOOGLE_RECAPTCHA_ENDPOINT =
  'https://www.google.com/recaptcha/api/siteverify';
const GOOGLE_RECAPTCHA_ENABLED = !_.isBlank(
  process.env.RECAPTCHA_SERVER_SECRET
);
const XEM_MAX = parseInt(process.env.XEM_MAX || config.xemMax);
const XEM_MIN = parseInt(process.env.XEM_MIN || config.xemMin);
const ENOUGH_BALANCE = parseInt(
  process.env.ENOUGH_BALANCE || config.enoughBalance
);
const MAX_UNCONFIRMED = parseInt(
  process.env.MAX_UNCONFIRMED || config.maxUnconfirmed
);
const WAIT_HEIGHT = parseInt(process.env.WAIT_HEIGHT || config.waitHeight);
const API_URL = `${process.env.API_HOST}:${process.env.API_PORT}`;

const router = express.Router();
const faucetAccount = nem.Account.createFromPrivateKey(
  process.env.PRIVATE_KEY,
  nem.NetworkType[process.env.NETWORK]
);
const accountHttp = new nem.AccountHttp(API_URL);
const blockchainHttp = new nem.BlockchainHttp(API_URL);
const mosaicHttp = new nem.MosaicHttp(API_URL);
const namespaceHttp = new nem.NamespaceHttp(API_URL);
const mosaicService = new nem.MosaicService(
  accountHttp,
  mosaicHttp,
  namespaceHttp
);
const transactionHttp = new nem.TransactionHttp(API_URL);

router.post('/', async (req, res, next) => {
  const address = req.body.address;
  const message = req.body.message;
  const encrypt = req.body.encrypt;
  const amount = req.body.amount;
  const reCaptcha = req.body['g-recaptcha-response'];
  const reCaptchaUrl = reCaptchaValidationUrl(reCaptcha);
  const params = _.omitBy(
    {
      address: address,
      message: message,
      encrypt: encrypt,
      amount: amount
    },
    _.isBlank
  );

  const query = qs.stringify(params);
  const recipientAddress = nem.Address.createFromRawAddress(address);

  if (GOOGLE_RECAPTCHA_ENABLED) {
    const reCaptchaRes = await requestReCaptchaValidation(reCaptchaUrl).catch(
      _ => false
    );
    if (!reCaptchaRes) {
      req.flash('error', 'Failed ReCaptcha. Please try again.');
      res.redirect(`/?${query}`);
      return;
    }
  }

  const currentHeight = await blockchainHttp
    .getBlockchainHeight()
    .toPromise()
    .catch(err => err);
  console.debug(`Current Height => %d`, currentHeight.compact());

  rx.forkJoin([
    mosaicService.mosaicsAmountViewFromAddress(recipientAddress).pipe(
      op.mergeMap(_ => _),
      op.find(mo => mo.fullName() === 'nem:xem'),
      op.catchError(err => {
        if (err.code === 'ECONNREFUSED') {
          throw new Error(err.message);
        }
        const response = JSON.parse(err.response.text);
        if (response.code === 'ResourceNotFound') {
          return rx.of(null);
        } else {
          throw new Error('Something wrong with MosaicService response');
        }
      }),
      op.map(xem => {
        if (xem && xem.relativeAmount() > ENOUGH_BALANCE) {
          throw new Error(
            `Your account already has enough balance => (${xem.relativeAmount()})`
          );
        }
        return xem;
      })
    ),
    mosaicService.mosaicsAmountViewFromAddress(faucetAccount.address).pipe(
      op.mergeMap(_ => _),
      op.find(mo => mo.fullName() === 'nem:xem'),
      op.catchError(err => {
        if (err.code === 'ECONNREFUSED') {
          throw new Error(err.message);
        }
        const response = JSON.parse(err.response.text);
        if (response.code === 'ResourceNotFound') {
          return rx.of(null);
        } else {
          throw new Error('Something wrong with MosaicService response');
        }
      }),
      op.map(xem => {
        if (xem.relativeAmount() < 50000) {
          throw new Error('The faucet has been drained.');
        }
        return xem;
      })
    ),
    accountHttp.outgoingTransactions(faucetAccount, { pageSize: 25 }).pipe(
      op.catchError(err => {
        if (err.code === 'ECONNREFUSED') {
          throw new Error(err.message);
        }
      }),
      op.mergeMap(_ => _),
      op.filter(tx => tx.type === nem.TransactionType.TRANSFER),
      op.filter(tx => {
        return (
          tx.recipient.equals(recipientAddress) &&
          currentHeight.compact() - tx.transactionInfo.height.compact() <
            WAIT_HEIGHT
        );
      }),
      op.toArray(),
      op.map(txes => {
        if (txes.length > 0) {
          throw new Error('Too many claiming.');
        }
        return true;
      })
    ),
    accountHttp.unconfirmedTransactions(faucetAccount, { pageSize: 100 }).pipe(
      op.catchError(err => {
        if (err.code === 'ECONNREFUSED') {
          throw new Error(err.message);
        }
      }),
      op.mergeMap(_ => _),
      op.filter(tx => tx.type === nem.TransactionType.TRANSFER),
      op.filter(tx => tx.recipient.equals(recipientAddress)),
      op.toArray(),
      op.map(txes => {
        if (txes.length > MAX_UNCONFIRMED) {
          throw new Error('Too many unconfirmed claiming.');
        }
        return true;
      })
    )
  ])
    .pipe(
      op.mergeMap(results => {
        const [_, xemFaucetOwned, outgoings, unconfirmed] = results;

        if (!(outgoings && unconfirmed)) {
          throw new Error(
            'Something wrong with outgoing or unconfirmed checking.'
          );
        }

        // determine amount to pay out
        const faucetBalance = xemFaucetOwned.amount.compact() - 1000000;
        const txAmount =
          sanitizeAmount(amount) ||
          Math.min(faucetBalance, randomInRange(XEM_MIN, XEM_MAX));
        console.debug(`Faucet balance => %d`, faucetBalance);
        console.debug(`Payout amount => %d`, txAmount);

        const message = buildMessage(req.body.message, req.body.encrypt, null);
        const transferTx = buildTransferTransaction(
          recipientAddress,
          nem.XEM.createRelative(txAmount),
          message
        );
        const signedTx = faucetAccount.sign(transferTx);

        return transactionHttp.announce(signedTx).pipe(
          op.mergeMap(response => {
            return rx.of({
              response,
              hash: signedTx.hash
            });
          })
        );
      })
    )
    .subscribe(
      result => {
        const txHash = result.hash;
        req.flash('txHash', txHash);
        res.redirect(`/?${query}`);
      },
      err => {
        console.error(err);
        req.flash('error', err.data ? err.data.message : err.toString());
        res.redirect(`/?${query}`);
      }
    );
});

function buildMessage(message, encrypt = false, publicAccount = null) {
  if (encrypt && publicAccount === null) {
    throw new Error('Public Key required to encrypt message.');
  }
  if (encrypt) {
    // NOTE: nem2-sdk does not have EncryptMessage yet.
    console.debug('Encrypted message => %s', message);
    throw new Error('Not implemented Encrypt message.');
  } else if (_.isBlank(message)) {
    console.debug('Plain message => %s', message);
    return nem.EmptyMessage;
  } else {
    console.debug('Empty message');
    return nem.PlainMessage.create(message);
  }
}

function buildTransferTransaction(address, transferrable, message) {
  return nem.TransferTransaction.create(
    nem.Deadline.create(1439, jsJoda.ChronoUnit.MINUTES),
    address,
    [transferrable],
    message,
    nem.NetworkType[process.env.NETWORK]
  );
}

async function requestReCaptchaValidation(url) {
  return new Promise((resolve, reject) => {
    request({ url: url, json: true }, (err, res) => {
      if (!err && res.statusCode == 200 && res.body['success']) {
        resolve(res.body);
      } else {
        reject(err);
      }
    });
  });
}

function reCaptchaValidationUrl(response) {
  const q = qs.stringify({
    secret: process.env.RECAPTCHA_SERVER_SECRET,
    response: response
  });
  return `${GOOGLE_RECAPTCHA_ENDPOINT}?${q}`;
}

function randomInRange(from, to) {
  return ~~(Math.random() * (from - to + 1) + to);
}

function sanitizeAmount(amount) {
  amount = parseFloat(amount) * 1000000;
  if (amount > XEM_MAX) {
    return XEM_MAX;
  } else if (amount < 0) {
    return 0;
  } else {
    return amount;
  }
}

module.exports = router;
