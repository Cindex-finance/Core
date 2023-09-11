// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;


library Formula {

    function calDeltaAmounts(uint256[] memory currentRatios, uint256[] memory targetRatios, uint256[] memory amounts) internal pure returns(uint256[] memory) {
        uint256 num = currentRatios.length;
        int256 minDeltaRatio = 1e18;
        uint256 minIndex = 0;
        for(uint256 i = 0; i < num; i++) {
            uint256 tmp = targetRatios[i] * currentRatios[0] / targetRatios[0];
            int256 deltaRatio = tmp > currentRatios[i] ? int256((tmp - currentRatios[i]) * 1e18 / currentRatios[i]) : -int256((currentRatios[i] - tmp) * 1e18 / currentRatios[i]);
            if (deltaRatio < minDeltaRatio) {
                minDeltaRatio = deltaRatio;
                minIndex = i;
            }
        }
        uint256[] memory deltaAmts = new uint256[](num);
        for(uint256 i = 0; i < num; i++) {
            uint256 amount = amounts[minIndex] * targetRatios[i] / targetRatios[minIndex];
            deltaAmts[i] = amount > amounts[i] ? amount - amounts[i] : 0;
        }
        return deltaAmts;
    }

    function calMaxGapCoin(uint256[] memory currentRatios, uint256[] memory targetRatios, uint256[] memory amounts, uint256[] memory prices, uint8[] memory decimals) internal pure returns(uint256[] memory, uint256) {
        uint256 num = currentRatios.length;
        int256 minDeltaRatio = 1e18;
        uint256 minIndex = 0;
        for(uint256 i = 0; i < num; i++) {
            uint256 tmp = targetRatios[i] * currentRatios[0] / targetRatios[0];
            int256 deltaRatio = tmp > currentRatios[i] ? int256((tmp - currentRatios[i]) * 1e18 / currentRatios[i]) : -int256((currentRatios[i] - tmp) * 1e18 / currentRatios[i]);
            if (deltaRatio < minDeltaRatio) {
                minDeltaRatio = deltaRatio;
                minIndex = i;
            }
        }
        uint256 maxIndex = 0;
        uint256[] memory deltaAmts = new uint256[](num);
        uint256 maxValue = 0;
        for(uint256 i = 0; i < num; i++) {
            uint256 amount = amounts[minIndex] * targetRatios[i] / targetRatios[minIndex];
            deltaAmts[i] = amount > amounts[i] ? amount - amounts[i] : 0;
            uint256 deltaValue = deltaAmts[i] * prices[i] / decimals[i];
            if (deltaValue > maxValue) {
                maxValue = deltaValue;
                maxIndex = i;
            }
        }
        return (deltaAmts, maxIndex);
    }


    function calIncrease(uint256[] memory amounts, uint256[] memory targetRatios, uint256[] memory deltaAmt, uint256 index, uint256 value) internal pure returns (uint256[] memory) {
        uint256 num = amounts.length;
        uint256[] memory t = new uint256[](num);
        t[index] = value;
        
        if (t[index] > deltaAmt[index]) {
            for (uint256 i = 0; i < num; i++) {
                t[i] = deltaAmt[i] + targetRatios[i] * (t[index] - deltaAmt[index]) / targetRatios[index];
            }
        } else {
            for (uint256 i = 0; i < num; i++) {
                t[i] = deltaAmt[i] * t[index] / deltaAmt[index];
            }
        }
        
        return t;
    }

    function dot(uint256[] memory amounts, uint256[] memory prices, uint8[] memory decimals) internal pure returns (uint256) {
        uint256 result = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            result += amounts[i] * prices[i] / (10 ** decimals[i]);
        }
        return result;
    }

    function calMultiple(uint256[] memory ratios, uint256[] memory prices, uint8[] memory decimals, uint256 value, uint256[] memory amounts) internal pure returns (uint256) {
        require(ratios.length == prices.length && ratios.length == amounts.length, "Invalid input length");
        
        uint256 dotProductKP = 0;
        uint256 dotProductTP = 0;
        
        for (uint256 i = 0; i < ratios.length; i++) {
            dotProductKP += ratios[i] * prices[i] * 1e18 / (10 ** decimals[i]);
            dotProductTP += amounts[i] * prices[i] / (10 ** decimals[i]);
        }
        
        return (value - dotProductTP) * 1e36 / dotProductKP;
    }

    function calDecrease(uint256[] memory amounts, uint256[] memory targetRatios, uint256[] memory prices, uint8[] memory decimals, uint256 value) internal pure returns (uint256[] memory) {
        uint256[] memory Kt = targetRatios;
        uint256 num = amounts.length;
        uint256[] memory T1 = new uint256[](num);
        uint256[] memory res = new uint256[](num);
        while (true) {
            uint256 mul_t = calMultiple(Kt, prices, decimals, value, T1);
            uint256[] memory Tt = new uint256[](num);
            int256[] memory F1 = new int256[](num);
            bool isReduce = false;
            for (uint256 j = 0; j < num; j++) {
                Tt[j] = Kt[j] > 0 ? mul_t * Kt[j] / 1e18 : amounts[j];
                if (Tt[j] > amounts[j]) {
                    isReduce = true;
                }
                if (Tt[j] < amounts[j]) {
                    F1[j] = 1;
                } else {
                    T1[j] = amounts[j];
                }
            }
            if (isReduce) {
                for (uint256 j = 0; j < num; j++) {
                    Kt[j] = F1[j] > 0 ? targetRatios[j] : 0;
                }
            } else {
                for (uint256 j = 0; j < num; j++) {
                    Tt[j] = Kt[j] > 0 ? mul_t * Kt[j] / 1e18 : amounts[j];
                    res[j] = amounts[j] - Tt[j];
                }
                break;
            }
        }
        return res;
    }
}