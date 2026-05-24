import {ExtendedChatAnalysis} from "@/lib/types/chat-analysis";

export interface DashboardHeaderProps {
	viewMode?: "admin" | "employee"
	onViewModeChange?: (mode: "admin" | "employee") => void
}

export interface ChatMessage {
	id: string
	text: string
	created_at: number
	author_id: number
	author_name: string
	is_client: boolean
}

export interface Deal {
	id: number
	name: string
	price: number
	status_id: number
	created_at: number
	_embedded?: {
		contacts?: Array<{ id: number; is_main?: boolean }>
		companies?: Array<{ id: number }>
	}
}

export interface Stats {
	totalDeals: number
	totalAmount: number
	wonDeals: number
	lostDeals: number
	inProgress: number
	monthDeals: number
	monthAmount: number
	yearDeals: number
	yearAmount: number
	avgDealAmount: number
	conversion: number
}

export interface DashboardData {
	user: {
		id: number
		name: string
		email: string
		role?: string
	}
	stats: Stats
	recentDeals: Deal[]
}

export type MetricColor = 'blue' | 'green' | 'purple' | 'orange'
export type StatColor = 'green' | 'red' | 'blue'

export interface Employee {
	id: number
	name: string
	email: string
}

export interface EmployeeStats {
	employeeId: number
	employeeName: string
	totalDeals: number
	totalAmount: number
	successTotal: number
	failTotal: number
	successMonth: number
	failMonth: number
	newClientsMonth: number
	targetClientsMonth: number
}

export interface DashboardData {
	aggregated: EmployeeStats
	employees: EmployeeStats[]
}

export interface ChatAIAnalysisProps {
	chatId: string
	onSendSuggestion?: (text: string) => void
}

export interface AnalysisResponse {
	success: boolean
	analysis: ExtendedChatAnalysis
	messages_count: number
	used_ai: boolean
	contact?: {
		name?: string
		id?: number
	}
	error?: string
	message?: string
}

export interface CreateChatRequest {
	contactName?: string
	contactPhone?: string
	contactEmail?: string
	dealId?: number
}

export interface AmojoResponse {
	id?: string
	user?: {
		id?: string
		client_id?: string
		name?: string
		avatar?: string
		phone?: string
		email?: string
	}
	[key: string]: unknown
}


export interface AmoCrmDeal {
	id: number
	name: string
	price: number
	status_id: number
	created_at: number
	closed_at: number
	responsible_user_id: number
	_embedded?: {
		contacts?: Array<{
			id: number
			name: string
		}>
		companies?: Array<{
			id: number
			name: string
		}>
	}
}

export interface DealWithContacts {
	id: number
	name: string
	price: number
	status_id: number
	created_at: number
	_embedded?: {
		contacts?: Array<{
			id: number
			name: string
			first_name?: string
			last_name?: string
		}>
		companies?: Array<{
			id: number
			name: string
		}>
	}
}

export interface AmoCrmUser {
	id: number
	name: string
	email: string
	rights?: {
		leads?: {
			view: 'all' | 'own' | 'none'
		}
	}
}

export interface AmoCrmUserWithAmojoId extends AmoCrmUser {
	amojo_id?: string
}

export interface AmoCrmAccount {
	id: number
	name: string
	subdomain: string
	current_user_id: number
}

export interface ApiResponse<T> {
	_embedded?: {
		leads?: T[]
		users?: T[]
	}
	_links?: {
		self?: { href: string }
		next?: { href: string }
	}
}

export interface LogData {
	status: number
	hasData: boolean
	count: number
}

export type WithEmbedded<T> = T & {
	_embedded?: {
		leads?: unknown[]
	}
}

export interface AmojoMessage {
	timestamp: number
	message?: {
		id?: string
		text?: string
	}
	sender?: {
		id?: string
		name?: string
		client_id?: string
		ref_id?: string
	}
}

export interface AmojoResponse {
	messages?: AmojoMessage[]
	new_message?: {
		msgid?: string
		conversation_id?: string
	}
}

export interface TalkResponse {
	id?: number
	chat_id?: string
	[key: string]: unknown
}

export interface DonutChartProps {
	title: string
	value1: number
	value2: number
	label1: string
	label2: string
	color1: string
	color2: string
}

export interface Talk {
	talkId: number
	time_execute: Date
	auto_close: number
	read_status: number
	status: number
	emotion: string
	last_message: string
	last_message_date: Date
	last_message_author: {
		id: number
		type: string
	}
	chat_id: string
	entity_id: number
	entity_type: number
	origin: string
	source_id: number
	reaction: string | null
	last_reaction: string | null
	origin_icon: string
	category: string
	can_start_nps: boolean
}

export type UserRole = "admin" | "employee"

export interface User {
	id: number
	name: string
	email: string
	role: UserRole
	avatar?: string
}

export interface AuthContextType {
	user: User | null
	login: (email: string, password: string) => Promise<boolean>
	logout: () => Promise<void>
	isLoading: boolean
	isAuthenticated: boolean
}

export interface UserData {
	id: string
	username: string
	password: string
	name: string
	role: "admin" | "employee"
}

export interface SalesData {
	employeeId: string
	successTotal: number
	failTotal: number
	successMonth: number
	failMonth: number
	newClientsMonth: number
	targetClientsMonth: number
}

export interface Message {
	id: string
	text: string
	created_at: number
	author_id?: number
	author_name?: string
	is_client?: boolean
}

export interface TalkInfo {
	id: number
	chat_id: string
	origin?: string
	created_at?: number
	updated_at?: number
	is_in_work?: boolean
	is_read?: boolean
	url?: string
	entity_id?: number
	entity_type?: string
}

export interface ChatModalProps {
	deal: {
		id: number
		name: string
		price: number
		contact_name?: string
		company_name?: string
	} | null
	isOpen: boolean
	onClose: () => void
	userId: number
	userName: string
}

export interface ChatWidgetProps {
	dealId: number
	contactId: number
	userId: number
}

export interface ChatsResponse {
	_embedded?: {
		chats?: Array<{
			chat_id?: string
			token?: string
			entity_id?: number
		}>
	}
}

export interface CacheData<T = unknown> {
	data: T
	expiresAt: number
	createdAt: number
	chatId: string
	messageCount: number
}

export type CacheEntry<T = unknown> = CacheData<T>

export interface DealWithContacts {
	id: number
	name: string
	price: number
	_embedded?: {
		contacts?: Array<{
			id: number
			name: string
			first_name?: string | undefined;
			last_name?: string | undefined;
		}>
		companies?: Array<{
			id: number
			name: string
		}>
	}
}

export interface SendMessageResult {
	message?: {
		msgid?: string
		id?: string
	}
	conversation_id?: string
}

export interface ProtectedRouteProps {
	children: React.ReactNode
}
