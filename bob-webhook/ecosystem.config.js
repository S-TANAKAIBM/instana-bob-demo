module.exports = {
  apps: [{
    name: 'bob-webhook',
    script: 'src/index.js',
    cwd: '/home/ubuntu/instana-bob-demo/bob-webhook',
    env: {
      BOB_API_KEY: 'bob_prod_bob-user_4i2BVSF6TYMXoQ7H4GnLwdaFaEaEY2tDrbe5wQnjPV9QyVFkexDxq8DFHw94Kj5WKwBPiynu9Hfi6rjeD4yhuf8a_Fmi84ot3xFzCgcWhT5XUZKGb3aw86984mHWKFtk65sWa',
      GITHUB_TOKEN: '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',
      GH_TOKEN: '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',
      NODE_ENV: 'production'
    }
  }]
};
