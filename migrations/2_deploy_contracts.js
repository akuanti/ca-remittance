var Remittance = artifacts.require("./Remittance.sol");
var HashLib = artifacts.require("HashLib.sol");

module.exports = function(deployer) {
  deployer.deploy(HashLib);
  deployer.link(HashLib, Remittance);
  deployer.deploy(Remittance);
};
