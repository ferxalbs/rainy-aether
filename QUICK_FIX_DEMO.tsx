/**
 * DEMO FILE - Quick Fix Examples
 * Open this file in Rainy Aether to see Quick Fixes in action
 */

// ❌ ERROR 1: Variable declared but never used
// Quick Fix: Remove unused variable
const unusedVariable = 42;

// ❌ ERROR 2: Missing import
// Quick Fix: Add missing import
function MyComponent() {
  return <div>Hello World</div>; // Missing React import
}

// ❌ ERROR 3: Misspelled property
// Quick Fix: Fix typo
const user = {
  name: 'John',
  age: 30
};
console.log(user.nam); // Typo: should be 'name'

// ❌ ERROR 4: Type mismatch
// Quick Fix: Add type annotation or fix type
function greet(name: string) {
  return `Hello, ${name}`;
}
greet(123); // Type error: number instead of string

// ❌ ERROR 5: Missing semicolon (if linter is active)
// Quick Fix: Add semicolon
const message = "Hello"

// ❌ ERROR 6: Unused function parameter
// Quick Fix: Prefix with underscore or remove
function processData(data: string, unusedParam: number) {
  return data.toUpperCase();
}

// ❌ ERROR 7: Cannot find name
// Quick Fix: Import from module or declare variable
console.log(unknownVariable);

// ❌ ERROR 8: Expression expected
// Quick Fix: Complete the expression
const incomplete =

// ✅ WORKING EXAMPLE: No errors
export function WorkingExample() {
  const [count, setCount] = useState(0); // If React is imported

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
