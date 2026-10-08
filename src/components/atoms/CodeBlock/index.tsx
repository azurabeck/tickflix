import { tokenizeLine } from "@/actions/presentation/codesnippet";
import "./style.scss";

interface CodeBlockProps {
  code: string;
  firstLine?: number; // número da primeira linha no arquivo (as linhas são numeradas a partir dele)
}

// Bloco de código escuro, com número de linha e cores simples (comentário, texto, palavra-chave). Rola dentro dele quando o trecho é grande.
const CodeBlock = ({ code, firstLine = 1 }: CodeBlockProps) => (
  <pre className="code-block">
    <code>
      {code.split("\n").map((line, index) => (
        <span key={index} className="code-block__line">
          <span className="code-block__number">{firstLine + index}</span>
          <span className="code-block__text">
            {tokenizeLine(line).map((token, i) => (
              <span key={i} className={`code-block__token code-block__token--${token.kind}`}>
                {token.text}
              </span>
            ))}
          </span>
        </span>
      ))}
    </code>
  </pre>
);

export default CodeBlock;
