import {
  RACE_COMPLETE_INFOS
} from "./types";
import * as utils from './utils';

import * as ethbchain from './network_integration';
import * as sc from '../services/smartcontract';
const race_blockchain_cache = {};

export const getRaceCompleteInfos = (id) => {
  return dispatch => {

    let coins = [];
    let winningCoins = [];
    const race = race_blockchain_cache[id];
    let hasReward = false;
    //load from cache if available.
    if (utils.nonNull(race)) {
      utils.dispatcher(dispatch, RACE_COMPLETE_INFOS, race);
    } else {
      let raceInstance;
      //1. get coins info
      ethbchain.__race(id).then(function (instance) {
        raceInstance = instance;

        return instance.inspectCoins();
      }).then(function (inspectCoins) {
        coins = raceCoinsInfo(inspectCoins);
        //2. get winning coins
        return raceInstance.winningCoins();
      }).then(function (_winningCoins) {
        winningCoins = raceWinners(_winningCoins);
        return raceInstance.hasClaimedReward(sc.smartcontract.context);
      }).then(function (_hasReward) {
        hasReward = _hasReward;
        return raceInstance.myWinnings(sc.smartcontract.context);
      }).then(function (_myWinnings) {

        const ether = ethbchain.web3Instance.utils.fromWei(_myWinnings.toString(), 'ether');
        utils.dispatcher(dispatch, RACE_COMPLETE_INFOS, (race_blockchain_cache[id] = {
          id: id,
          coins: coins,
          loaded: true,
          winningCoins: winningCoins,
          myWinnings: ether,
          canClaim:hasReward
        }));
      }).catch(function (err) {
        console.log(err);
        utils.dispatcher(dispatch, RACE_COMPLETE_INFOS, err);
      });
    }
  }
};

//cache values to prevent constant communication with network

function raceWinners(coins) {

  const winners = [];
  for (let i = 0; i < coins.length; i++) {
    winners.push(coins[i].toNumber());
  }
  return winners;
}

function raceCoinsInfo(coins) {
  const results = [];

  for (let i = 0; i < coins[0].length; i++) {
    const s = coins[3][i].toNumber();
    const e = coins[4][i].toNumber();
    const change = (((e - s) / s) * 100).toFixed(5);
    const end = (e / ethbchain.PRECISION).toFixed(5);
    const start = (s / ethbchain.PRECISION).toFixed(5);

    results.push({
      coinId: coins[0][i].toNumber(),
      total: ethbchain.web3Instance.utils.fromWei(coins[1][i].toString(), "ether"),
      numOfBets: coins[2][i].toNumber(),
      startPrice: start,
      endPrice: end,
      change: change
    });

  }
  results.sort(function (a, b) {
    return b.change - a.change;
  });
  return results;
}