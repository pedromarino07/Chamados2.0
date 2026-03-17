/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'colaborador' | 'tecnico' | 'admin';

export interface User {
  id: number;
  name: string;
  login: string;
  role: UserRole;
  sector: string;
  extension: string;
  is_first_login: boolean;
}

export type TicketStatus = 'pending' | 'in_progress' | 'on_hold' | 'resolved' | 'finished';

export interface Ticket {
  id: number;
  requester_id: number;
  technician_id: number | null;
  category_id: number;
  description: string;
  status: TicketStatus;
  urgency: 'baixa' | 'media' | 'alta';
  extension: string;
  hold_justification: string | null;
  reopening_reason?: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
  
  // Joined fields
  requester_name?: string;
  technician_name?: string;
  category_name?: string;
  sector?: string;
}

export interface Category {
  id: number;
  name: string;
}

export interface TicketHistory {
  id: number;
  ticket_id: number;
  old_status: TicketStatus | null;
  new_status: TicketStatus;
  changed_by: number;
  comment: string | null;
  timestamp: string;
  changed_by_name?: string;
}
