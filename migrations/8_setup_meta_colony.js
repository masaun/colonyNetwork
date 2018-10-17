/* globals artifacts */
/* eslint-disable no-console */

const assert = require("assert");

const Token = artifacts.require("./Token");
const IColonyNetwork = artifacts.require("./IColonyNetwork");
const ITokenLocking = artifacts.require("./ITokenLocking");
const EtherRouter = artifacts.require("./EtherRouter");
const TokenAuthority = artifacts.require("./TokenAuthority");

module.exports = (deployer, network, accounts) => {
  // Create the meta colony
  let colonyNetwork;
  let tokenLockingAddress;
  let clnyToken;
  let metaColonyAddress;

  deployer
    .then(() => EtherRouter.deployed())
    .then(_etherRouter => IColonyNetwork.at(_etherRouter.address))
    .then(instance => {
      colonyNetwork = instance;
      return Token.new("Colony Network Token", "CLNY", 18);
    })
    .then(tokenInstance => {
      clnyToken = tokenInstance;
      return colonyNetwork.createMetaColony(clnyToken.address);
    })
    // These commands add the first address as a reputation miner. This isn't necessary (or wanted!) for a real-world deployment,
    // but is useful when playing around with the network to get reputation mining going.
    .then(() => colonyNetwork.getMetaColony())
    .then(_metaColonyAddress => {
      metaColonyAddress = _metaColonyAddress;
      return colonyNetwork.getTokenLocking();
    })
    .then(address => {
      tokenLockingAddress = address;
      return TokenAuthority.new(clnyToken.address, 0x0, metaColonyAddress, tokenLockingAddress);
    })
    .then(tokenAuthority => clnyToken.setAuthority(tokenAuthority.address))
    .then(() => clnyToken.mint(10000000000000000))
    .then(() => clnyToken.approve(tokenLockingAddress, "10000000000000000"))
    .then(() => ITokenLocking.at(tokenLockingAddress))
    .then(iTokenLocking => iTokenLocking.deposit(clnyToken.address, "10000000000000000"))
    .then(() => colonyNetwork.initialiseReputationMining())
    .then(() => colonyNetwork.startNextCycle())
    .then(() => colonyNetwork.getSkillCount())
    .then(async skillCount => {
      assert.equal(skillCount.toNumber(), 3);
      await clnyToken.setOwner(accounts[11]);
      console.log("### Meta Colony created at", metaColonyAddress);
    })
    .catch(err => {
      console.log("### Error occurred ", err);
    });
};
