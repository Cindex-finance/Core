// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

library Formula {
    /*
     *@dev calculate the number of missing tokens
     *@param currentRatios current proportion
     *@param amounts current number of tokens
     *@param targetRatio target proportion
     */
    function calDeltaAmounts(
        uint256[] memory currentRatios,
        uint256[] memory targetRatios,
        uint256[] memory amounts
    ) internal pure returns (uint256[] memory) {
        uint256 num = currentRatios.length;
        int256 minDeltaRatio = 1e18;
        uint256 minIndex = 0;
        for (uint256 i = 0; i < num; i++) {
            uint256 tmp = (targetRatios[i] * currentRatios[0]) /
                targetRatios[0];
            int256 deltaRatio = tmp > currentRatios[i]
                ? int256(((tmp - currentRatios[i]) * 1e18) / currentRatios[i])
                : -int256(((currentRatios[i] - tmp) * 1e18) / currentRatios[i]);
            if (deltaRatio < minDeltaRatio) {
                minDeltaRatio = deltaRatio;
                minIndex = i;
            }
        }
        uint256[] memory deltaAmts = new uint256[](num);
        for (uint256 i = 0; i < num; i++) {
            uint256 amount = (amounts[minIndex] * targetRatios[i]) /
                targetRatios[minIndex];
            deltaAmts[i] = amount > amounts[i] ? amount - amounts[i] : 0;
        }
        return deltaAmts;
    }

    /*
     *@dev calculate the number of missing tokens and the maximum missing token index
     *
     *@param currentRatios current proportion
     *@param targetRatio target proportion
     *@param amounts current number of tokens
     *@param prices token prices
     *@param decimals  token precision
     */
    function calMaxGapCoin(
        uint256[] memory currentRatios,
        uint256[] memory targetRatios,
        uint256[] memory amounts,
        uint256[] memory prices,
        uint8[] memory decimals
    ) internal pure returns (uint256[] memory, uint256) {
        uint256 num = currentRatios.length;
        int256 minDeltaRatio = 1e18;
        uint256 minIndex = 0;
        for (uint256 i = 0; i < num; i++) {
            uint256 tmp = (targetRatios[i] * currentRatios[0]) /
                targetRatios[0];
            int256 deltaRatio = tmp > currentRatios[i]
                ? int256(((tmp - currentRatios[i]) * 1e18) / currentRatios[i])
                : -int256(((currentRatios[i] - tmp) * 1e18) / currentRatios[i]);
            if (deltaRatio < minDeltaRatio) {
                minDeltaRatio = deltaRatio;
                minIndex = i;
            }
        }
        uint256 maxIndex = 0;
        uint256[] memory deltaAmts = new uint256[](num);
        uint256 maxValue = 0;
        for (uint256 i = 0; i < num; i++) {
            uint256 amount = (amounts[minIndex] * targetRatios[i]) /
                targetRatios[minIndex];
            deltaAmts[i] = amount > amounts[i] ? amount - amounts[i] : 0;
            uint256 deltaValue = (deltaAmts[i] * prices[i]) / decimals[i];
            if (deltaValue > maxValue) {
                maxValue = deltaValue;
                maxIndex = i;
            }
        }
        return (deltaAmts, maxIndex);
    }

    /*
     *@dev calculate token ratio based on user added tokens
     *
     *@param amounts current number of tokens
     *@param targetRatio target proportion
     *@param deltaAmt  missing tokens
     *@param index maximum missing tokens index
     *@param value user adding Tokens
     */
    function calIncrease(
        uint256[] memory amounts,
        uint256[] memory targetRatios,
        uint256[] memory deltaAmt,
        uint256 index,
        uint256 value
    ) internal pure returns (uint256[] memory) {
        uint256 num = amounts.length;
        uint256[] memory increaseAmts = new uint256[](num);
        increaseAmts[index] = value;

        if (increaseAmts[index] > deltaAmt[index]) {
            for (uint256 i = 0; i < num; i++) {
                increaseAmts[i] =
                    deltaAmt[i] +
                    (targetRatios[i] *
                        (increaseAmts[index] - deltaAmt[index])) /
                    targetRatios[index];
            }
        } else {
            for (uint256 i = 0; i < num; i++) {
                increaseAmts[i] =
                    (deltaAmt[i] * increaseAmts[index]) /
                    deltaAmt[index];
            }
        }

        return increaseAmts;
    }

    /*
     *@dev calculate the value of the pool
     *
     *@param amounts current number of tokens
     *@param targetRatio target proportion
     *@param prices token prices
     *@param decimals  token precision
     */
    function dot(
        uint256[] memory amounts,
        uint256[] memory prices,
        uint8[] memory decimals
    ) internal pure returns (uint256) {
        uint256 result = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            result += (amounts[i] * prices[i]) / (10 ** decimals[i]);
        }
        return result;
    }

    /*
     *@dev calculate token constant
     *
     *@param decreaseTokenRatio The proportion of tokens that need to be reduced
     *@param prices token prices
     *@param decimals  token Precision
     *@param lastValue remaining pool value
     *@param keepAmounts unchanged token amounts
     */
    function calMultiple(
        uint256[] memory decreaseTokenRatio,
        uint256[] memory prices,
        uint8[] memory decimals,
        uint256 lastValue,
        uint256[] memory keepAmounts
    ) internal pure returns (uint256) {
        require(
            decreaseTokenRatio.length == prices.length &&
                decreaseTokenRatio.length == keepAmounts.length,
            "Invalid input length"
        );

        uint256 decreaseValue = 0;
        uint256 keepValue = 0;

        for (uint256 i = 0; i < decreaseTokenRatio.length; i++) {
            decreaseValue +=
                (decreaseTokenRatio[i] * prices[i] * 1e18) /
                (10 ** decimals[i]);
            keepValue += (keepAmounts[i] * prices[i]) / (10 ** decimals[i]);
        }

        return ((lastValue - keepValue) * 1e36) / decreaseValue;
    }

    /*
     *@dev calculate the proportion of reduced tokens
     *
     *@param amounts current number of tokens
     *@param targetRatio target proportion
     *@param prices token prices
     *@param decimals  token precision
     *@param lastValue remaining pool value
     */
    function calDecrease(
        uint256[] memory amounts,
        uint256[] memory targetRatios,
        uint256[] memory prices,
        uint8[] memory decimals,
        uint256 lastValue
    ) internal pure returns (uint256[] memory) {
        uint256[] memory decreaseTokenRatio = targetRatios;
        uint256 num = amounts.length;
        uint256[] memory keepAmounts = new uint256[](num);
        uint256[] memory reduceTokens = new uint256[](num);
        while (true) {
            uint256 constant_t = calMultiple(
                decreaseTokenRatio,
                prices,
                decimals,
                lastValue,
                keepAmounts
            );
            uint256[] memory targetAmounts = new uint256[](num);
            int256[] memory markTokens = new int256[](num);
            bool isReduce = false;
            for (uint256 j = 0; j < num; j++) {
                targetAmounts[j] = decreaseTokenRatio[j] > 0
                    ? constant_t * decreaseTokenRatio[j]
                    : amounts[j];
                if (targetAmounts[j] > amounts[j]) {
                    isReduce = true;
                }
                if (targetAmounts[j] < amounts[j]) {
                    markTokens[j] = 1;
                } else {
                    keepAmounts[j] = amounts[j];
                }
            }
            if (isReduce) {
                for (uint256 j = 0; j < num; j++) {
                    decreaseTokenRatio[j] = markTokens[j] > 0
                        ? targetRatios[j]
                        : 0;
                }
            } else {
                for (uint256 j = 0; j < num; j++) {
                    targetAmounts[j] = decreaseTokenRatio[j] > 0
                        ? constant_t * decreaseTokenRatio[j]
                        : amounts[j];
                    reduceTokens[j] = amounts[j] - targetAmounts[j];
                }
                break;
            }
        }
        return reduceTokens;
    }
}
