var Remittance = artifacts.require("./Remittance.sol");
var HashLib = artifacts.require("./HashLib.sol");


// TODO: update tests!
contract('Remittance', function(accounts) {
  var remittance, hashlib;

  var owner = accounts[0];
  var to = accounts[1];

  var secret1 = "secret1";
  var secret2 = "secret2";
  var remittanceAmount = 10;
  var secretHash;

  before("", function() {
    return HashLib.new({from: owner})
      .then(_hl => {
        hashlib = _hl;
      });
  });

  beforeEach(function() {
    return hashlib.multiHash(web3.sha3(secret1), web3.sha3(secret2))
      .then(_secretHash => {
        secretHash = _secretHash;
        return Remittance.new(to, secretHash, {from: owner, value: remittanceAmount});
      })
      .then(_remittance => {
        remittance = _remittance;
      });
  });

  it("should set the balance, receiver, and secret", function() {
    return remittance.balance.call()
      .then(balance => {
        assert.strictEqual(balance.toString(10), String(remittanceAmount));
        return remittance.secretHash.call();
      })
      .then(_hash => {
        assert.strictEqual(_hash, secretHash);
        return remittance.receiver.call();
      })
      .then(_receiver => {
        assert.strictEqual(_receiver, to);
      });
  });

  // deposit
  it("should increase balance with deposit", function() {
    var initialBalance;
    var depositAmount = 10;
    return remittance.balance.call()
      .then(_balance => {
        initialBalance = _balance;
        return remittance.deposit({from: owner, value: depositAmount});
      })
      .then(txObject => {
        return remittance.balance.call();
      })
      .then(_balance => {
        assert(_balance > initialBalance);
      });
  });

  // withdraw
  it("should withdraw money if the right secrets are given", function() {
    var hash1 = web3.sha3(secret1);
    var hash2 = web3.sha3(secret2);

    return remittance.withdraw(hash1, hash2, {from: to})
      .then(txObject => {
        return remittance.balance.call();
      })
      .then(_balance => {
        assert.strictEqual(_balance.toNumber(), 0);
      });
  });

  // claim
  it("should have zero balance after claim", function() {
    var initialBalance;
    return remittance.balance.call()
      .then(_balance => {
        initialBalance = _balance;
        return remittance.claim({from: owner});
      })
      .then(txObject => {
        return remittance.balance.call();
      })
      .then(_balance => {
        assert.strictEqual(_balance.toNumber(), 0);
      });
  });
});
