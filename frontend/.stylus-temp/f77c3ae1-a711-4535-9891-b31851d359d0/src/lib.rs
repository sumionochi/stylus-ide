
// Q-Learning Maze Agent - Based on Watkins (1989)
// "Learning from Delayed Rewards"
// Implements temporal-difference Q-learning on-chain (deterministic pseudo-random exploration)

// IMPORTANT: Only use no_std when NOT exporting ABI
// The export-abi feature requires std for the macro expansion
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

extern crate alloc;

#[allow(unused_imports)]
use alloc::{vec, vec::Vec};

use stylus_sdk::{
    alloy_primitives::{I256, U256},
    prelude::*,
};

// Maze configuration
const MAZE_SIZE: usize = 5;
const NUM_ACTIONS: usize = 4; // Up, Down, Left, Right
const SCALE: i64 = 10_000;    // Fixed-point scale

// Maze layout (1 = wall, 0 = path)
const MAZE: [[u8; MAZE_SIZE]; MAZE_SIZE] = [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0],
];

const START_POS: (usize, usize) = (0, 0);
const GOAL_POS: (usize, usize) = (4, 4);

sol_storage! {
    #[entrypoint]
    pub struct QLearningMaze {
        // (state_action_key) -> q_value (scaled i64 stored as int256)
        mapping(uint256 => int256) q_table;

        bool trained;
        uint256 episodes_completed;
        address owner;
    }
}

impl QLearningMaze {
    #[inline(always)]
    fn state_action_key(row: usize, col: usize, action: usize) -> U256 {
        let state = row * MAZE_SIZE + col;
        U256::from((state * NUM_ACTIONS + action) as u64)
    }

    #[inline(always)]
    fn get_q(&self, row: usize, col: usize, action: usize) -> i64 {
        let key = Self::state_action_key(row, col, action);
        let val: I256 = self.q_table.get(key);
        val.as_limbs()[0] as i64
    }

    #[inline(always)]
    fn set_q(&mut self, row: usize, col: usize, action: usize, value: i64) {
        let key = Self::state_action_key(row, col, action);
        let val_i256 = I256::try_from(value).unwrap_or(I256::ZERO);
        self.q_table.setter(key).set(val_i256);
    }

    fn get_best_action(&self, row: usize, col: usize) -> usize {
        let mut best_action = 0usize;
        let mut best_q = self.get_q(row, col, 0);

        for action in 1..NUM_ACTIONS {
            let q = self.get_q(row, col, action);
            if q > best_q {
                best_q = q;
                best_action = action;
            }
        }
        best_action
    }

    fn get_max_q(&self, row: usize, col: usize) -> i64 {
        let a = self.get_best_action(row, col);
        self.get_q(row, col, a)
    }

    fn step(&self, row: usize, col: usize, action: usize) -> ((usize, usize), i64, bool) {
        let (new_row, new_col) = match action {
            0 => (row.saturating_sub(1), col),
            1 => ((row + 1).min(MAZE_SIZE - 1), col),
            2 => (row, col.saturating_sub(1)),
            3 => (row, (col + 1).min(MAZE_SIZE - 1)),
            _ => (row, col),
        };

        if MAZE[new_row][new_col] == 1 {
            return ((row, col), -10 * SCALE, false);
        }

        if new_row == GOAL_POS.0 && new_col == GOAL_POS.1 {
            return ((new_row, new_col), 100 * SCALE, true);
        }

        ((new_row, new_col), -1 * SCALE, false)
    }
}

#[public]
impl QLearningMaze {
    pub fn train(
        &mut self,
        episodes: U256,
        max_steps: U256,
        epsilon: U256,
        alpha: U256,
        gamma: U256,
    ) {
        let mut episodes_u32 = episodes.as_limbs()[0] as u32;
        let mut max_steps_u32 = max_steps.as_limbs()[0] as u32;

        episodes_u32 = episodes_u32.min(1000);
        max_steps_u32 = max_steps_u32.min(100);

        let epsilon_val = (epsilon.as_limbs()[0] as i64).clamp(0, SCALE);
        let alpha_val   = (alpha.as_limbs()[0] as i64).clamp(0, SCALE);
        let gamma_val   = (gamma.as_limbs()[0] as i64).clamp(0, SCALE);

        for episode in 0..episodes_u32 {
            let mut row = START_POS.0;
            let mut col = START_POS.1;

            for step_i in 0..max_steps_u32 {
                let rand = (episode.wrapping_mul(7919).wrapping_add(step_i.wrapping_mul(6997))) % (SCALE as u32);

                let action: usize = if rand < (epsilon_val as u32) {
                    ((episode.wrapping_mul(3).wrapping_add(step_i.wrapping_mul(5))) % (NUM_ACTIONS as u32)) as usize
                } else {
                    self.get_best_action(row, col)
                };

                let ((next_row, next_col), reward, done) = self.step(row, col, action);

                let current_q = self.get_q(row, col, action);
                let max_next_q = if done { 0 } else { self.get_max_q(next_row, next_col) };

                let target = reward + (gamma_val * max_next_q) / SCALE;
                let td_error = target - current_q;
                let new_q = current_q + (alpha_val * td_error) / SCALE;

                self.set_q(row, col, action, new_q);

                if done {
                    break;
                }

                row = next_row;
                col = next_col;
            }
        }

        self.trained.set(true);
        self.episodes_completed.set(U256::from(episodes_u32));
    }

    pub fn get_q_value(&self, row: U256, col: U256, action: U256) -> I256 {
        let r = (row.as_limbs()[0] as usize).min(MAZE_SIZE - 1);
        let c = (col.as_limbs()[0] as usize).min(MAZE_SIZE - 1);
        let a = (action.as_limbs()[0] as usize).min(NUM_ACTIONS - 1);

        let q = self.get_q(r, c, a);
        I256::try_from(q).unwrap_or(I256::ZERO)
    }

    pub fn get_policy(&self, row: U256, col: U256) -> U256 {
        let r = (row.as_limbs()[0] as usize).min(MAZE_SIZE - 1);
        let c = (col.as_limbs()[0] as usize).min(MAZE_SIZE - 1);
        U256::from(self.get_best_action(r, c) as u64)
    }

    pub fn is_trained(&self) -> bool {
        self.trained.get()
    }

    pub fn get_training_info(&self) -> (bool, U256) {
        (self.trained.get(), self.episodes_completed.get())
    }

    pub fn get_maze_config(&self) -> (U256, U256, U256, U256, U256, U256) {
        (
            U256::from(MAZE_SIZE as u64),
            U256::from(NUM_ACTIONS as u64),
            U256::from(START_POS.0 as u64),
            U256::from(START_POS.1 as u64),
            U256::from(GOAL_POS.0 as u64),
            U256::from(GOAL_POS.1 as u64),
        )
    }

    pub fn is_wall(&self, row: U256, col: U256) -> bool {
        let r = (row.as_limbs()[0] as usize).min(MAZE_SIZE - 1);
        let c = (col.as_limbs()[0] as usize).min(MAZE_SIZE - 1);
        MAZE[r][c] == 1
    }
}
