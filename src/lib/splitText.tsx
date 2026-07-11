import type { ReactNode } from "react";

export function splitChars(text: string): ReactNode {
  return text.split(" ").map((word, wi) => (
    <span className="word" aria-hidden="true" key={`${word}-${wi}`}>
      {word.split("").map((char, ci) => (
        <span className="char" key={`${char}-${ci}`}>
          {char}
        </span>
      ))}
      {wi < text.split(" ").length - 1 ? "\u00A0" : null}
    </span>
  ));
}
