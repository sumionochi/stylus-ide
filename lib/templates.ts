export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
}

export const templates: ContractTemplate[] = [
  {
    id: "counter",
    name: "Counter",
    description: "Simple counter contract with increment and decrement",
    code: `// Counter Contract
  // A simple counter that can be incremented and decremented
  
  use stylus_sdk::prelude::*;
  use stylus_sdk::storage::{StorageU256};
  
  #[storage]
  #[entrypoint]
  pub struct Counter {
      count: StorageU256,
  }
  
  #[public]
  impl Counter {
      /// Get the current count
      pub fn get(&self) -> U256 {
          self.count.get()
      }
  
      /// Increment the counter by 1
      pub fn increment(&mut self) {
          let current = self.count.get();
          self.count.set(current + U256::from(1));
      }
  
      /// Decrement the counter by 1
      pub fn decrement(&mut self) {
          let current = self.count.get();
          if current > U256::from(0) {
              self.count.set(current - U256::from(1));
          }
      }
  
      /// Set the counter to a specific value
      pub fn set(&mut self, value: U256) {
          self.count.set(value);
      }
  
      /// Reset counter to zero
      pub fn reset(&mut self) {
          self.count.set(U256::from(0));
      }
  }`,
  },
  {
    id: "erc20",
    name: "ERC-20 Basic",
    description: "Basic ERC-20 token implementation",
    code: `// Basic ERC-20 Token
  // Simplified token implementation with mint and transfer
  
  use stylus_sdk::prelude::*;
  use stylus_sdk::storage::{StorageMap, StorageU256, StorageAddress};
  use stylus_sdk::msg;
  
  #[storage]
  #[entrypoint]
  pub struct Token {
      balances: StorageMap<Address, U256>,
      allowances: StorageMap<Address, StorageMap<Address, U256>>,
      total_supply: StorageU256,
      owner: StorageAddress,
  }
  
  #[public]
  impl Token {
      /// Initialize the token with initial supply
      pub fn init(&mut self, initial_supply: U256) {
          let sender = msg::sender();
          self.owner.set(sender);
          self.total_supply.set(initial_supply);
          self.balances.setter(sender).set(initial_supply);
      }
  
      /// Get balance of an address
      pub fn balance_of(&self, account: Address) -> U256 {
          self.balances.get(account)
      }
  
      /// Get total supply
      pub fn total_supply(&self) -> U256 {
          self.total_supply.get()
      }
  
      /// Transfer tokens to another address
      pub fn transfer(&mut self, to: Address, amount: U256) -> bool {
          let sender = msg::sender();
          let sender_balance = self.balances.get(sender);
          
          if sender_balance < amount {
              return false;
          }
  
          self.balances.setter(sender).set(sender_balance - amount);
          let recipient_balance = self.balances.get(to);
          self.balances.setter(to).set(recipient_balance + amount);
          
          true
      }
  
      /// Mint new tokens (owner only)
      pub fn mint(&mut self, to: Address, amount: U256) -> bool {
          if msg::sender() != self.owner.get() {
              return false;
          }
  
          let recipient_balance = self.balances.get(to);
          self.balances.setter(to).set(recipient_balance + amount);
          
          let supply = self.total_supply.get();
          self.total_supply.set(supply + amount);
          
          true
      }
  }`,
  },
  {
    id: "storage",
    name: "Storage Example",
    description: "Demonstrates various storage types in Stylus",
    code: `// Storage Types Example
  // Demonstrates different storage patterns in Stylus
  
  use stylus_sdk::prelude::*;
  use stylus_sdk::storage::{StorageU256, StorageBool, StorageAddress, StorageMap, StorageVec};
  
  #[storage]
  #[entrypoint]
  pub struct StorageExample {
      // Simple value storage
      number: StorageU256,
      flag: StorageBool,
      owner: StorageAddress,
      
      // Map storage (key => value)
      balances: StorageMap<Address, U256>,
      
      // Vector storage (dynamic array)
      items: StorageVec<U256>,
  }
  
  #[public]
  impl StorageExample {
      /// Set a number
      pub fn set_number(&mut self, value: U256) {
          self.number.set(value);
      }
  
      /// Get the number
      pub fn get_number(&self) -> U256 {
          self.number.get()
      }
  
      /// Toggle the flag
      pub fn toggle_flag(&mut self) {
          let current = self.flag.get();
          self.flag.set(!current);
      }
  
      /// Get the flag
      pub fn get_flag(&self) -> bool {
          self.flag.get()
      }
  
      /// Set balance for an address
      pub fn set_balance(&mut self, account: Address, amount: U256) {
          self.balances.setter(account).set(amount);
      }
  
      /// Get balance of an address
      pub fn get_balance(&self, account: Address) -> U256 {
          self.balances.get(account)
      }
  
      /// Add item to vector
      pub fn add_item(&mut self, value: U256) {
          self.items.push(value);
      }
  
      /// Get item from vector
      pub fn get_item(&self, index: U256) -> U256 {
          let idx = index.as_usize();
          self.items.get(idx).unwrap_or(U256::from(0))
      }
  
      /// Get vector length
      pub fn items_count(&self) -> U256 {
          U256::from(self.items.len())
      }
  }`,
  },
];

export function getTemplate(id: string): ContractTemplate | undefined {
  return templates.find((t) => t.id === id);
}
