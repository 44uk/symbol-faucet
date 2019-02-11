const config = require('config');
const express = require('express');
const nem = require('nem2-sdk');
const op = require('rxjs/operators');
const router = express.Router();

const MOSAIC_FQN = process.env.MOSAIC_FQN || 'nem:xem';
const OUT_MAX = parseInt(process.env.OUT_MAX || config.outMax);
const OUT_MIN = parseInt(process.env.OUT_MIN || config.outMin);
const OUT_OPT = parseInt(process.env.OUT_OPT || ~~((OUT_MAX + OUT_MIN) / 2));
const API_URL = process.env.API_URL;

const faucetAccount = nem.Account.createFromPrivateKey(
  process.env.PRIVATE_KEY,
  nem.NetworkType[process.env.NETWORK]
);
const accountHttp = new nem.AccountHttp(API_URL);
const mosaicService = new nem.MosaicService(
  accountHttp,
  new nem.MosaicHttp(API_URL),
  new nem.NamespaceHttp(API_URL)
);

router.get('/', function(req, res, next) {
  const address = req.query.address;
  const message = req.query.message;
  const encrypt = req.query.encrypt;
  const mosaic = req.query.mosaic;
  const amount = req.query.amount;

  accountHttp
    .getAccountInfo(faucetAccount.address)
    .pipe(
      op.mergeMap(account => {
        return mosaicService
          .mosaicsAmountViewFromAddress(faucetAccount.address)
          .pipe(
            op.mergeMap(_ => _),
            op.find(mosaic => mosaic.fullName() === MOSAIC_FQN),
            op.map(mosaic => ({ mosaic, account }))
          );
      }),
      op.catchError(err => {
        if (err.code === 'ECONNREFUSED') {
          throw new Error(err.message);
        }
        const res = JSON.parse(err.response.text);
        if (res.code === 'ResourceNotFound') {
          throw new Error(res.message);
        } else {
          throw new Error('Something wrong with MosaicService response');
        }
      })
    )
    .subscribe(
      mosaicView => {
        const faucetBalance = mosaicView.mosaic.relativeAmount();
        const drained = faucetBalance < OUT_MIN;
        res.render('index', {
          drained: drained,
          txHash: req.flash('txHash'),
          error: req.flash('error'),
          outMax: OUT_MAX,
          outMin: OUT_MIN,
          outOpt: OUT_OPT,
          step: 1 / Math.pow(10, mosaicView.mosaic.mosaicInfo.divisibility),
          address: address,
          message: message,
          encrypt: encrypt,
          mosaic: mosaic,
          amount: amount,
          faucetAddress: mosaicView.account.address.pretty(),
          faucetBalance: faucetBalance,
          recaptchaSecret: process.env.RECAPTCHA_CLIENT_SECRET,
          network: process.env.NETWORK,
          apiUrl: process.env.API_URL,
          publicUrl: process.env.PUBLIC_URL || process.env.API_URL,
          mosaicFqn: MOSAIC_FQN
        });
      },
      err => next(err)
    );
});

module.exports = router;
