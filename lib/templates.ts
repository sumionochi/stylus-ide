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
    description: "Simple counter with increment/decrement",
    code: `// Counter Contract - SDK 0.9.x
  #![cfg_attr(not(feature = "export-abi"), no_main)]
  extern crate alloc;
  
  use stylus_sdk::{alloy_primitives::U256, prelude::*};
  
  sol_storage! {
      #[entrypoint]
      pub struct Counter {
          uint256 number;
      }
  }
  
  #[public]
  impl Counter {
      pub fn number(&self) -> U256 {
          self.number.get()
      }
  
      pub fn set_number(&mut self, new_number: U256) {
          self.number.set(new_number);
      }
  
      pub fn increment(&mut self) {
          let number = self.number.get();
          self.number.set(number + U256::from(1u8));
      }
  
      pub fn decrement(&mut self) {
          let number = self.number.get();
          if number > U256::from(0u8) {
              self.number.set(number - U256::from(1u8));
          }
      }
  }`,
  },
  {
    id: "erc20",
    name: "ERC-20 Basic",
    description: "Basic ERC-20 token implementation",
    code: `// ERC-20 Token - SDK 0.9.x
  #![cfg_attr(not(feature = "export-abi"), no_main)]
  extern crate alloc;
  
  use stylus_sdk::{
      alloy_primitives::{Address, U256},
      prelude::*,
      msg,
  };
  
  sol_storage! {
      #[entrypoint]
      pub struct Erc20 {
          mapping(address => uint256) balances;
          uint256 total_supply;
      }
  }
  
  #[public]
  impl Erc20 {
      pub fn balance_of(&self, account: Address) -> U256 {
          self.balances.get(account)
      }
  
      pub fn total_supply(&self) -> U256 {
          self.total_supply.get()
      }
  
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
  }`,
  },
  {
    id: "storage",
    name: "Storage Example",
    description: "Demonstrates storage types",
    code: `// Storage Types - SDK 0.9.x
  #![cfg_attr(not(feature = "export-abi"), no_main)]
  extern crate alloc;
  
  use stylus_sdk::{
      alloy_primitives::{Address, U256},
      prelude::*,
  };
  
  sol_storage! {
      #[entrypoint]
      pub struct StorageExample {
          uint256 number;
          bool flag;
          address owner;
          mapping(address => uint256) balances;
      }
  }
  
  #[public]
  impl StorageExample {
      pub fn set_number(&mut self, value: U256) {
          self.number.set(value);
      }
  
      pub fn get_number(&self) -> U256 {
          self.number.get()
      }
  
      pub fn toggle_flag(&mut self) {
          let current = self.flag.get();
          self.flag.set(!current);
      }
  
      pub fn get_flag(&self) -> bool {
          self.flag.get()
      }
  
      pub fn set_balance(&mut self, account: Address, amount: U256) {
          self.balances.setter(account).set(amount);
      }
  
      pub fn get_balance(&self, account: Address) -> U256 {
          self.balances.get(account)
      }
  }`,
  },
];

export function getTemplate(id: string): ContractTemplate | undefined {
  return templates.find((t) => t.id === id);
}
