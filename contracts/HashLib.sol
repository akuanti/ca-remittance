pragma solidity ^0.4.4;

library HashLib {
  function multiHash(bytes32 hashA, bytes32 hashB)
    constant
    returns (bytes32)
  {
    return sha3(hashA, hashB);
  }
}
