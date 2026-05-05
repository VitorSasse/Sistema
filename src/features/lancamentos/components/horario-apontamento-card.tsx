"use client";

import type { KeyboardEvent } from "react";
import type {
  HorarioApontamentoFeedback,
  HorarioApontamentoState
} from "@/features/lancamentos/types";

type HorarioKey = keyof HorarioApontamentoState;

type HorarioApontamentoCardProps = {
  horarios: HorarioApontamentoState;
  feedback: HorarioApontamentoFeedback;
  onChange: (key: HorarioKey, value: string) => void;
  onCalculate: () => boolean;
};

function Field({
  label,
  value,
  placeholder,
  onChange,
  onKeyDown
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input
        className="field-control"
        inputMode="numeric"
        maxLength={5}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </label>
  );
}

export function HorarioApontamentoCard({
  horarios,
  feedback,
  onChange,
  onCalculate
}: HorarioApontamentoCardProps) {
  function handleEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    onCalculate();
  }

  return (
    <div className="horario-helper-card">
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div>
          <h4 style={{ margin: 0 }}>Calculo por horario</h4>
          <p className="section-copy">
            Preencha inicio e fim. Se houver almoco, informe saida e retorno.
            Pressione Enter no fim para calcular a quantidade apontada.
          </p>
        </div>
      </div>

      <div className="form-grid-4">
        <Field
          label="Inicio do servico"
          value={horarios.inicioServico}
          placeholder="07:30"
          onChange={(value) => onChange("inicioServico", value)}
        />
        <Field
          label="Saida para almoco"
          value={horarios.saidaAlmoco}
          placeholder="12:00"
          onChange={(value) => onChange("saidaAlmoco", value)}
        />
        <Field
          label="Retorno do almoco"
          value={horarios.retornoAlmoco}
          placeholder="13:00"
          onChange={(value) => onChange("retornoAlmoco", value)}
        />
        <Field
          label="Fim do servico"
          value={horarios.fimServico}
          placeholder="17:30"
          onChange={(value) => onChange("fimServico", value)}
          onKeyDown={handleEnter}
        />
      </div>

      {feedback.message ? (
        <p
          className={`message-inline ${
            feedback.tone === "error"
              ? "message-inline-danger"
              : feedback.tone === "success"
                ? "message-inline-success"
                : ""
          }`}
          style={{ marginTop: 14, marginBottom: 0 }}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
