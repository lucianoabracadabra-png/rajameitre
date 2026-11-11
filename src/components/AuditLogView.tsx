import React, { useState } from 'react';
import { AuditLogEntry } from '../types';
import {
  History,
  ShieldCheck,
  Search,
  User,
  Filter,
  ExternalLink,
  Calendar,
} from 'lucide-react';

interface AuditLogViewProps {
  logs: AuditLogEntry[];
  onOpenGuestComanda: () => void;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  onOpenGuestComanda,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.author.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAuthor = selectedAuthor === 'all' || log.author === selectedAuthor;
    return matchesSearch && matchesAuthor;
  });

  const authors = Array.from(new Set(logs.map((l) => l.author)));

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#d3a809] uppercase tracking-widest">
            <History className="w-4 h-4" />
            <span>Auditoria & Governança Interna</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1 font-display">
            Histórico Geral de Alterações
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Registro cronológico das operações realizadas pelos maîtres (FSOUZA, LAUGUSTO, GILSON).
          </p>
        </div>

        <button
          onClick={onOpenGuestComanda}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer self-start md:self-auto"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#d3a809]" />
          Ver Comanda Convidado
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 p-4 rounded-2xl border border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-neutral-400 flex items-center gap-1.5 font-medium">
            <Filter className="w-3.5 h-3.5 text-[#d3a809]" />
            Filtrar por Maître:
          </span>
          <button
            onClick={() => setSelectedAuthor('all')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
              selectedAuthor === 'all'
                ? 'bg-[#d3a809] text-neutral-950 font-bold'
                : 'bg-white/[0.05] text-neutral-400 hover:text-white'
            }`}
          >
            Todos ({logs.length})
          </button>
          {authors.map((auth) => (
            <button
              key={auth}
              onClick={() => setSelectedAuthor(auth)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer font-mono ${
                selectedAuthor === auth
                  ? 'bg-[#d3a809] text-neutral-950 font-bold'
                  : 'bg-white/[0.05] text-neutral-400 hover:text-white'
              }`}
            >
              {auth}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar no histórico..."
            className="w-full pl-8 pr-3 py-1.5 bg-black/50 border border-white/[0.1] rounded-lg text-xs text-white placeholder-neutral-500 outline-none focus:border-[#d3a809]"
          />
        </div>
      </div>

      {/* AUDIT LOGS TIMELINE LIST */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] text-neutral-400 uppercase tracking-wider text-[10px] border-b border-white/[0.08]">
              <tr>
                <th className="py-3 px-4">Data & Hora</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Ação</th>
                <th className="py-3 px-4">Detalhamento da Operação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-neutral-500 italic">
                    Nenhum registro encontrado para este filtro.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-neutral-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#d3a809]" />
                        {log.timestamp}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] font-mono font-bold text-white text-[11px]">
                        <User className="w-3 h-3 text-[#d3a809]" />
                        {log.author}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-[10px] uppercase font-bold text-[#d3a809] tracking-wider px-2 py-0.5 rounded bg-[#d3a809]/10 border border-[#d3a809]/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-200 leading-relaxed font-light">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
