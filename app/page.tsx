"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(0);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h1>カウンター</h1>
      <p style={{ fontSize: "48px" }}>{count}</p>
      <button onClick={decrement}>-1</button>
      <button onClick={reset}>リセット</button>
      <button onClick={increment}>+1</button>
    </div>
  );
}
