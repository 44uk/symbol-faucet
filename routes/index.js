const config = require('config');
const express = require('express');
const nem = require('nem2-sdk');
const op = require('rxjs/operators');
const router = express.Router();

const XEM_MAX = parseInt(process.env.XEM_MAX || config.xemMax);
const XEM_MIN = parseInt(process.env.XEM_MIN || config.xemMin);
const XEM_OPT = parseInt(process.env.XEM_OPT || ~~((XEM_MAX + XEM_MIN) / 2));
const API_URL = `${process.env.API_HOST}:${process.env.API_PORT}`;

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
            op.find(mosaic => mosaic.fullName() === 'nem:xem'),
            op.map(xem => ({ xem, account }))
          );
      }),
      op.catchError(err => {
        const response = JSON.parse(err.response.text);
        if (response.code === 'ResourceNotFound') {
          throw new Error(
            `Resource Not Found => ${faucetAccount.address.pretty()}`
          );
        } else {
          throw new Error('Something wrong with MosaicService response');
        }
      })
    )
    .subscribe(
      data => {
        const faucetBalance = data.xem.relativeAmount();
        const drained = faucetBalance < XEM_MIN;
        res.render('index', {
          drained: drained,
          txHash: req.flash('txHash'),
          error: req.flash('error'),
          xemMax: XEM_MAX,
          xemMin: XEM_MIN,
          xemOpt: XEM_OPT,
          address: address,
          message: message,
          encrypt: encrypt,
          mosaic: mosaic,
          amount: amount,
          faucetAddress: data.account.address.pretty(),
          faucetBalance: faucetBalance,
          recaptchaSecret: process.env.RECAPTCHA_CLIENT_SECRET,
          network: process.env.NETWORK,
          apiHost: process.env.API_HOST,
          apiPort: process.env.API_PORT
        });
      },
      err => next(err)
    );
});

module.exports = router;
