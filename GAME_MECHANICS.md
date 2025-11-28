# Qu-Zing! Game Mechanics & Features

This document outlines the new gameplay mechanics designed to increase strategy, social interaction, and excitement in Qu-Zing!

## 1. Power-ups (The "Mario Kart" Effect)
Players receive a limited inventory of special abilities to use alongside their tokens.

### Types
*   **Double Down (x2):** 
    *   **Effect:** Doubles the points for the current round if the answer is correct.
    *   **Risk:** If incorrect, the token is lost as usual (high risk, high reward).
*   **Safety Net:** 
    *   **Effect:** If you answer incorrectly, you get your token back (it returns to your hand instead of being discarded).
    *   **Strategy:** Best used with high-value tokens on difficult questions.
*   **50/50:** 
    *   **Effect:** Removes 2 incorrect answers (for Multiple Choice questions).
    *   **Implementation:** Visually disables 2 wrong options for the player.

## 2. The Endgame Gambit ("The Trifecta")
A high-stakes side bet available only near the end of the game.

### Mechanics
*   **Trigger:** Available at the start of the **3rd-to-last round** (e.g., Round 8 of 10).
*   **The Stake:** The game identifies the player's **highest value token** currently in hand.
*   **The Bet:** Player opts in to "Activate Gambit".
*   **Win Condition:** Answer the **next 3 questions consecutively** correctly.
*   **Reward:** **2x Stake Value** added as bonus points at the end.
*   **Penalty:** If *any* of the 3 questions are missed:
    *   Immediate loss of points equal to the Stake Value.
    *   Gambit ends immediately.
    *   Streak resets.

## 3. Streak Fire
Rewards consistency and adds visual flair.

### Mechanics
*   **Activation:** Answering 2+ questions correctly in a row.
*   **Visuals:** 
    *   **Orange/Red Fire:** Normal streak (2+ correct).
    *   **Blue/Plasma Fire:** Active Endgame Gambit.
*   **Bonus:** 
    *   2 Streak: +1 point
    *   3 Streak: +2 points
    *   4+ Streak: +3 points

## 4. Comeback Bonus (Rubber Banding)
Keeps the game competitive for trailing players.

### Mechanics
*   **Condition:** Player is in the bottom 50% of the leaderboard.
*   **Effect:** **1.2x Multiplier** on points earned for correct answers.
*   **Note:** Applies before Streak bonuses.

## 5. Speed Demon
Rewards fast thinking.

### Mechanics
*   **Condition:** Answer submitted within the first **3 seconds** of the voting phase.
*   **Effect:** **+2 Bonus Points**.
*   **UI:** A "Speed Demon" icon or effect appears on the results screen.

## 6. Strategic Token Trading (Token Alchemy)
Allows players to manage their token inventory, especially useful when "Safety Net" results in a surplus of tokens.

### Mechanics
*   **Combine (Fuse):** 
    *   **Action:** Trade **2** tokens of value $N$ for **1** token of value $\min(2N, 10)$.
    *   **Math:** $N + N \to 2N$ (capped at 10).
    *   **Strategy:** Consolidate low-value tokens or surplus tokens into high-value ones.
    *   **Example:** Trade two **3**s for one **6**. Trade two **5**s for one **10**.
*   **Split (Fission):** 
    *   **Action:** Trade **1** token of value $N$ for **2** tokens that sum to $N$.
    *   **Math:** $N \to \lfloor N/2 \rfloor + \lceil N/2 \rceil$.
    *   **Strategy:** Break down a high-value token to spread risk across multiple questions.
    *   **Example:** Trade one **10** for two **5**s. Trade one **7** for a **3** and a **4**.
*   **Constraint:** Can only be done if the player has the required tokens.

## Summary of Scoring Formula
$$
Score = (TokenValue \times Multipliers) + Bonuses
$$

Where:
*   **Multipliers:** 
    *   Double Down (x2)
    *   Comeback Bonus (x1.2)
*   **Bonuses:**
    *   Streak Bonus (+1/2/3)
    *   Speed Demon (+2)
    *   Gambit Reward (End of game only)
