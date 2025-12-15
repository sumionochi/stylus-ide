export interface ParsedFunction {
  name: string;
  type: "function";
  stateMutability: "view" | "pure" | "nonpayable" | "payable";
  inputs: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
    internalType?: string;
  }>;
}

export function parseABI(abiString: string): ParsedFunction[] {
  try {
    const abi = JSON.parse(abiString);
    return abi.filter(
      (item: any) => item.type === "function"
    ) as ParsedFunction[];
  } catch (error) {
    console.error("Failed to parse ABI:", error);
    return [];
  }
}

export function isReadFunction(func: ParsedFunction): boolean {
  return func.stateMutability === "view" || func.stateMutability === "pure";
}

export function isWriteFunction(func: ParsedFunction): boolean {
  return (
    func.stateMutability === "nonpayable" || func.stateMutability === "payable"
  );
}

export function groupFunctionsByType(functions: ParsedFunction[]): {
  read: ParsedFunction[];
  write: ParsedFunction[];
} {
  return {
    read: functions.filter(isReadFunction),
    write: functions.filter(isWriteFunction),
  };
}

export function formatFunctionSignature(func: ParsedFunction): string {
  const params = func.inputs
    .map((input) => `${input.type} ${input.name || ""}`)
    .join(", ");
  const returns =
    func.outputs.length > 0
      ? ` returns (${func.outputs.map((output) => output.type).join(", ")})`
      : "";
  return `${func.name}(${params})${returns}`;
}
