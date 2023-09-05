// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;


library Formula {

    function calDeltaAmounts(uint256[] memory amounts, uint256[] memory targetRatios) internal pure returns(uint256[] memory) {
        uint256 num = amounts.length;
        uint256[] memory amounts1 = new uint256[](num);
        for (uint256 i = 0; i < num; i++) {
            uint256[] memory amountsTmp = new uint256[](num);
            for (uint256 j = 0; j < num; j++) {
                amountsTmp[j] = (targetRatios[j] * amounts[i]) / targetRatios[i];
            }
            if (amountsTmp[0] > amounts1[0]) {
                amounts1 = amountsTmp;
            }
        }
        uint256[] memory deltaAmt = new uint256[](num);
        for (uint i = 0; i < num; i++) {
            deltaAmt[i] = amounts1[i] - amounts[i];
        }
        return deltaAmt;
    } 

    function calMaxGapCoin(uint256[] memory amounts, uint256[] memory targetRatios, uint256[] memory prices) internal pure returns (uint256[] memory, uint256) {
        uint256 num = amounts.length;
        uint256[] memory amounts1 = new uint256[](num);
        for (uint256 i = 0; i < num; i++) {
            uint256[] memory amountsTmp = new uint256[](num);
            for (uint256 j = 0; j < num; j++) {
                amountsTmp[j] = (targetRatios[j] * amounts[i]) / targetRatios[i];
            }
            if (amountsTmp[0] > amounts1[0]) {
                amounts1 = amountsTmp;
            }
        }
        uint256[] memory deltaAmt = new uint256[](num);
        uint256[] memory deltaValue = new uint256[](num);
        uint256 maxIndex = 0;
        for (uint i = 0; i < num; i++) {
            deltaAmt[i] = amounts1[i] - amounts[i];
            deltaValue[i] = deltaAmt[i] * prices[i];
            uint256 j = i + 1;
            if (j < num && deltaValue[i] > deltaValue[maxIndex]) {
                maxIndex = i;
            }
        }
        return (deltaAmt, maxIndex);
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

    function dot(uint256[] memory a, uint256[] memory b) internal pure returns (uint256) {
        uint256 result = 0;
        for (uint256 i = 0; i < a.length; i++) {
            result += a[i] * b[i];
        }
        return result;
    }

    function calMultiple(uint256[] memory ratios, uint256[] memory prices, uint256 value, uint256[] memory amounts) internal pure returns (uint256) {
        require(ratios.length == prices.length && ratios.length == amounts.length, "Invalid input length");
        
        uint256 dotProductKP = 0;
        uint256 dotProductTP = 0;
        
        for (uint256 i = 0; i < ratios.length; i++) {
            dotProductKP += ratios[i] * prices[i];
            dotProductTP += amounts[i] * prices[i];
        }
        
        return (value - dotProductTP) / dotProductKP;
    }

    function calDecrease(uint256[] memory amounts, uint256[] memory targetRatios, uint256[] memory prices, uint256 value) internal pure returns (uint256[] memory) {
        uint256[] memory Kt = targetRatios;
        uint256 num = amounts.length;
        uint256[] memory T1 = new uint256[](num);
        uint256[] memory res = new uint256[](num);
        while (true) {
            uint256 mul_t = calMultiple(Kt, prices, value, T1);
            uint256[] memory Tt = new uint256[](num);
            int256[] memory F1 = new int256[](num);
            bool isReduce = false;
            for (uint256 j = 0; j < num; j++) {
                Tt[j] = Kt[j] > 0 ? mul_t * Kt[j] : amounts[j];
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
                    Tt[j] = Kt[j] > 0 ? mul_t * Kt[j] : amounts[j];
                    res[j] = amounts[j] - Tt[j];
                }
                break;
            }
        }
        return res;
    }


}