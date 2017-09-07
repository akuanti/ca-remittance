var Remittance = artifacts.require("./Remittance.sol");
var HashLib = artifacts.require("./HashLib.sol");

const Promise = require('bluebird');
Promise.promisifyAll(web3.eth, {suffix: "Promise"});
Promise.promisifyAll(web3.version, {suffix: "Promise"});

const expectException = require("../utils/expectedException.js");


contract('Remittance', function(accounts) {
  var remittance, hashlib;

  var owner = accounts[0];
  var to = accounts[1];

  var secret1 = "secret1";
  var secret2 = "secret2";
  var remittanceAmount = 10;
  var secretHash;
  var initialBlock;
  var hash1, hash2;
  var gas = 3000000;

  before("", function() {
    hash1 = web3.sha3(secret1);
    hash2 = web3.sha3(secret2);

    return HashLib.new({from: owner})
      .then(_hl => {
        hashlib = _hl;
      });
  });

  beforeEach(function() {
    return Remittance.new({from: owner})
      .then(instance => {
        remittance = instance;
        return hashlib.multiHash(hash1, hash2)
      })
      .then(_secretHash => {
        secretHash = _secretHash;
        return web3.eth.getBlockNumberPromise();
      })
      .then(bn => {
        initialBlock = bn;
      });
  });

  // intialization tests
  it("should be owned by the owner", function() {
    return remittance.owner({from: owner})
      .then(_owner => {
        assert.strictEqual(_owner, owner, "Contract is not owned by owner");
      })
  });

  it("should set the balance, receiver, secret, and deadline", function() {
    return remittance.createRemittance(to, secretHash, initialBlock + 5, {from: owner, value: remittanceAmount})
      .then(() => {
        return remittance.remittances.call(secretHash);
      })
      .then(_r => {
        var [hash, receiver, balance, deadline] = _r;
        assert.strictEqual(hash, secretHash);
        assert.strictEqual(balance.toString(10), String(remittanceAmount));
        assert.strictEqual(receiver, to);
        assert.strictEqual(deadline.toNumber(), initialBlock + 5);
      });
  });

  it("should fail if you try to use the same secret twice", function() {
    var deadline = initialBlock + 5;
    return remittance.createRemittance(to, secretHash, deadline,
      {from: owner, value: remittanceAmount})
      .then(() => {
        return expectException(function () {
          return remittance.createRemittance(to, secretHash, deadline,
            {from: owner, value: remittanceAmount, gas: gas});
        }, gas);
      });
  });

  it("should fail if you try to create without any value", function() {
    var deadline = initialBlock + 5;

    return expectException(function() {
      return remittance.createRemittance(to, secretHash, deadline, {from: owner, gas: gas})
      }, gas);
  });

  it("should fail if you try to create without a receiver", function() {
    return expectException(function() {
      return remittance.createRemittance(0, secretHash, initialBlock + 5,
        {from: owner, value: remittanceAmount, gas: gas})
    }, gas);
  });

  it("should fail if you try to set a deadline too far in the future", function() {
    return expectException(function() {
      return remittance.createRemittance(to, secretHash, initialBlock + 50,
        {from: owner, value: remittanceAmount, gas: gas})
    }, gas);
  });


  // withdraw
  it("should withdraw money if the right secrets are given", function() {
    var deadline = initialBlock + 5;

    return remittance.createRemittance(to, secretHash, deadline, {from: owner, value: remittanceAmount})
      .then(() => {
        return remittance.withdraw(hash1, hash2, {from: to})
      })
      .then(txObject => {
        return remittance.remittances.call(secretHash);
      })
      .then(_r => {
        var balance = _r[2];
        assert.strictEqual(balance.toNumber(), 0);
      });
  });

  it("should only allow the receipient to withdraw", function() {
    var recipient = to;
    var eve = owner;
    return remittance.createRemittance(recipient, secretHash, initialBlock + 2,
      {from: owner, value: remittanceAmount})
      .then(() => {
        return expectException(function() {
          return remittance.withdraw(hash1, hash2,
            {from: eve, gas: gas})
        }, gas);
      });
  });

  it("should fail with the wrong secrets", function() {
    var eve = owner;
    return remittance.createRemittance(to, secretHash, initialBlock + 2,
      {from: owner, value: remittanceAmount})
      .then(() => {
        return expectException(function() {
          return remittance.withdraw(web3.sha3("wrong"), hash2,
            {from: eve, gas: gas})
        }, gas);
      });
  });

  it("should fail with zero balance", function() {
    var recipient = to;
    var eve = owner;
    return remittance.createRemittance(recipient, secretHash, initialBlock + 2,
      {from: owner, value: remittanceAmount})
      .then(() => {
        return remittance.withdraw(hash1, hash2, {from: recipient});
      })
      .then(txObject => {
        return expectException(function() {
          return remittance.withdraw(hash1, hash2,
            {from: recipient, gas: gas})
        }, gas);
      });
  });


  // claim
  it("should have zero balance after claim", function() {
    var deadline = initialBlock + 1;
    var initialBalance;

    return remittance.createRemittance(to, secretHash, deadline, {from: owner, value: remittanceAmount})
      .then(txObject => {
        return remittance.claim(secretHash, {from: owner});
      })
      .then(txObject => {
        return remittance.remittances.call(secretHash);
      })
      .then(_r => {
        var balance = _r[2];
        assert.strictEqual(balance.toNumber(), 0);
      });
  });

  it("should only allow the owner to claim", function() {
    var deadline = initialBlock + 1;
    var initialBalance;
    var eve = accounts[1];

    return remittance.createRemittance(to, secretHash, deadline, {from: owner, value: remittanceAmount})
      .then(txObject => {
        return expectException(function() {
          return remittance.claim(secretHash, {from: eve, gas: gas});
        }, gas);
      })
  });

  // should fail if called when there is zero balance
  it("should not allow claim with zero balance", function() {
    var deadline = initialBlock + 1;
    var initialBalance;

    return remittance.createRemittance(to, secretHash, deadline,
      {from: owner, value: remittanceAmount})
      .then(txObject => {
        return remittance.withdraw(hash1, hash2, {from: to});
      })
      .then(txObject => {
        return expectException(function() {
          return remittance.claim(secretHash, {from: owner, gas: gas});
        }, gas);
      });
  });

});
