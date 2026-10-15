package com.example.houseland.data.model

enum class TicketMode(val label: String, val badge: String) {
    COMPLIMENTARY("Cortesia Grátis", "Cortesia VIP"),
    PRE_REGISTRATION("Pré-cadastro", "Fila de Espera VIP"),
    DIRECT_SALE("Venda Direta", "Ingressos Liberados");

    companion object {
        fun fromString(value: String): TicketMode {
            return when (value.lowercase()) {
                "complimentary", "cortesia" -> COMPLIMENTARY
                "pre_registration", "pre-cadastro", "precadastro" -> PRE_REGISTRATION
                "direct_sale", "venda", "venda_direta" -> DIRECT_SALE
                else -> COMPLIMENTARY
            }
        }
    }
}

enum class TicketStatus(val label: String) {
    VALID("Válido"),
    USED("Utilizado"),
    CANCELLED("Cancelado")
}

enum class EventStatus(val label: String) {
    ACTIVE("Confirmado / Ativo"),
    DRAFT("Rascunho"),
    PAST("Edição Histórica")
}

enum class AdminRole(val label: String) {
    ADMIN("Administrador Geral"),
    SCANNER("Portaria / Scanner"),
    FINANCEIRO("Financeiro & Vendas")
}

data class Band(
    val id: String,
    val name: String,
    val genre: String,
    val timeSlot: String,
    val description: String,
    val imageResName: String,
    val highlightSong: String
)

data class BeerTap(
    val id: String = "",
    val name: String,
    val style: String = "",
    val abv: String,
    val ibu: String,
    val notes: String = ""
)

data class BbqItem(
    val id: String,
    val name: String,
    val cut: String,
    val description: String,
    val servedWith: String = ""
)

data class TicketPrices(
    val pista: Double = 60.0,
    val camarote: Double = 140.0
)

data class HouseLandEvent(
    val id: String,
    val title: String,
    val editionBadge: String,
    val slug: String,
    val status: EventStatus,
    val date: String,
    val doorsOpen: String,
    val location: String,
    val address: String,
    val capacity: Int,
    val bannerImageResName: String,
    val shortDescription: String,
    val fullDescription: String,
    val activeTicketMode: TicketMode,
    val bands: List<Band> = emptyList(),
    val beerTaps: List<BeerTap> = emptyList(),
    val bbqMenu: List<BbqItem> = emptyList(),
    val ticketPrices: TicketPrices = TicketPrices(),
    val contactWhatsApp: String = "5511999998888",
    val isPublished: Boolean = true,
    val showCapacityPublicly: Boolean = false,
    val highlights: List<String> = emptyList(),
    val attendeesCount: Int = 0
)

data class Ticket(
    val id: String,
    val eventId: String,
    val eventName: String,
    val name: String,
    val whatsapp: String,
    val cpf: String,
    val type: String,
    val status: TicketStatus,
    val qrCodeData: String,
    val createdAt: String,
    val usedAt: String? = null,
    val checkedInBy: String? = null,
    val batch: String = "Lote VIP",
    val price: Double = 0.0
)

data class Companion(
    val name: String,
    val cpf: String
)

data class Lead(
    val id: String,
    val eventId: String,
    val eventName: String,
    val name: String,
    val whatsapp: String,
    val cpf: String,
    val createdAt: String,
    val status: String = "pending", // pending, approved, rejected
    val ticketId: String? = null,
    val ticketQuantity: Int = 1,
    val unitPrice: Double = 50.0,
    val totalExpectedValue: Double = 50.0,
    val companions: List<Companion> = emptyList()
)

data class CheckInResult(
    val status: CheckInStatus,
    val ticket: Ticket? = null,
    val message: String,
    val timestamp: String = ""
)

enum class CheckInStatus {
    SUCCESS,
    ALREADY_USED,
    INVALID
}

data class SiteStat(
    val label: String,
    val value: String
)

data class SiteSettings(
    val brandName: String = "House Land 360",
    val brandSubtitle: String = "Rock & Craft Beer Experience",
    val heroBadgeText: String = "Edições Confirmadas 2026",
    val heroTitle: String = "A MAIOR EXPERIÊNCIA DE ROCK N’ ROLL & CHOPP ARTESANAL",
    val heroSubtitle: String = "A House Land é uma produtora independente dedicada a criar edições lendárias onde o som valvulado e o malte selecionado se encontram.",
    val agendaSectionTitle: String = "Agenda Oficial de Festivais & Rock Sessions",
    val ctaButtonText: String = "Ver Detalhes & Ingressos",
    val aboutBadge: String = "A NOSSA FILOSOFIA • MANIFESTO",
    val aboutTitle: String = "SOBRE A HOUSE LAND",
    val aboutText: String = "A House Land nasceu com a missão de resgatar o espírito cru, enérgico e autêntico do Rock n’ Roll, unindo-o à revolução das microcervejarias artesanais brasileiras. Não criamos eventos padronizados: cada edição possui curadoria independente de artistas, torneiras exclusivas e espaços industriais com acústica tratada.",
    val contactEmail: String = "contato@houseland.online",
    val contactWhatsapp: String = "(11) 99999-8888",
    val ctaPartnershipWhatsapp: String = "(11) 99999-8888",
    val partnershipTitle: String = "QUER TOCAR OU SERVIR NO FESTIVAL?",
    val partnershipDescription: String = "Se você tem uma banda autoral, tributo lendário ou representa uma cervejaria artesanal, entre em contato direto com a equipe de curadoria da produtora.",
    val footerBrandTitle: String = "HOUSE LAND 360",
    val footerBrandDescription: String = "Produtora e Portal oficial de eventos autorais de Rock n' Roll, Chopp Artesanal e Gastronomia Defumada.",
    val footerDisclaimer: String = "Eventos destinados a maiores de 18 anos. Beba com moderação. Se beber, não dirija.",
    val footerCnpj: String = "48.123.456/0001-78",
    val stats: List<SiteStat> = listOf(
        SiteStat("Puro Malte & Som Valvulado", "100%"),
        SiteStat("Público Acumulado", "+15 Mil"),
        SiteStat("De Tradição Independente", "8 Anos")
    ),
    val countdownEventId: String = "hl-out-2026",
    val showCountdown: Boolean = true
)

data class AdminUser(
    val uid: String,
    val name: String,
    val email: String,
    val role: AdminRole,
    val active: Boolean = true,
    val createdAt: String
)
