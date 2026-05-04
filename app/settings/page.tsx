import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSettings } from "@/lib/server/settings";
import { listAllTemplates } from "@/lib/server/recurring-queries";
import { FarolThresholdForm } from "@/components/settings/farol-threshold-form";
import { TemplatesList } from "@/components/settings/templates-list";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, templates] = await Promise.all([
    getSettings(),
    listAllTemplates(),
  ]);

  return (
    <div className="app">
      <div className="page">
        <div className="settings">
          <Link
            href="/"
            className="top-action ghost"
            style={{ marginBottom: 18, display: "inline-flex" }}
          >
            <ChevronLeft /> Voltar ao painel
          </Link>

          <h1>Configurações</h1>
          <div className="sub">Ajuste preferências e templates recorrentes.</div>

          <div className="setting-block">
            <h2>Limite do Farol</h2>
            <div className="sub2">
              Define quando o farol fica verde. Saldo / Receitas abaixo deste
              valor (e ≥ 0) acende amarelo.
            </div>
            <FarolThresholdForm initial={settings.farolGreenThresholdPct} />
          </div>

          <div className="setting-block">
            <h2>Trocar senha</h2>
            <div className="sub2">
              A senha de acesso é definida via variável de ambiente. Para alterar:
            </div>
            <ol
              style={{
                margin: "0 0 12px",
                paddingLeft: 18,
                color: "var(--ink-2)",
                fontSize: 12.5,
                lineHeight: 1.7,
              }}
            >
              <li>
                Defina <span className="code-block">APP_PASSWORD</span> no painel
                da Vercel
              </li>
              <li>Faça redeploy do projeto</li>
            </ol>
          </div>

          <div className="setting-block">
            <h2>Entradas recorrentes</h2>
            <div className="sub2">
              Todos os templates — incluindo encerrados (riscados) para checagem
              de sanidade.
            </div>
            <TemplatesList rows={templates} />
          </div>
        </div>
      </div>
    </div>
  );
}
