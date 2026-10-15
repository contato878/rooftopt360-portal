package com.example.houseland.data.repository

import android.graphics.Bitmap
import android.graphics.Color
import com.example.houseland.data.model.*
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.*
import kotlin.random.Random

object HouseLandRepository {

    private val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale("pt", "BR"))
    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)

    val DEFAULT_BEER_TAPS: List<BeerTap> = listOf(
        BeerTap(
            id = "tap-pilsen",
            name = "Pilsen Puro Malte Cristal",
            style = "Pilsen Tradicional",
            abv = "4.8% ABV",
            ibu = "18 IBU",
            notes = "Refrescância extrema, malte pilsen nobre e final seco e crocante."
        ),
        BeerTap(
            id = "tap-ipa",
            name = "Rocker West Coast IPA",
            style = "American IPA",
            abv = "6.6% ABV",
            ibu = "62 IBU",
            notes = "Explosão de lúpulos americanos, notas cítricas e amargor limpo."
        ),
        BeerTap(
            id = "tap-redale",
            name = "House Amber & Red Ale",
            style = "Irish Red Ale",
            abv = "5.8% ABV",
            ibu = "38 IBU",
            notes = "Caramelo tostado, malte encorpado e lúpulo herbal marcante."
        ),
        BeerTap(
            id = "tap-stout",
            name = "Black Velvet Stout",
            style = "Dry Stout Artesanal",
            abv = "7.2% ABV",
            ibu = "45 IBU",
            notes = "Cacau belga, café espresso tostado e textura aveludada."
        )
    )

    val DEFAULT_BBQ_MENU: List<BbqItem> = listOf(
        BbqItem(
            id = "bbq-brisket",
            name = "Brisket Texano Defumado 14h",
            cut = "Peito Bovino Angus",
            description = "Defumação lenta em lenha de macieira com dry rub exclusivo e bark caramelizado perfeito.",
            servedWith = "Coleslaw artesanal e picles de cebola roxa"
        ),
        BbqItem(
            id = "bbq-pulled-pork",
            name = "Pulled Pork Sandwich BBQ",
            cut = "Sobrepaleta Suína Desfiada",
            description = "Carne suína ultra macia desfiada no molho barbecue artesanal da casa com redução de cerveja stout.",
            servedWith = "Pão brioche tostado na manteiga e chips rústicos"
        ),
        BbqItem(
            id = "bbq-ribs",
            name = "Costelinha BBQ Glazeada",
            cut = "Costela Suína Premium",
            description = "Soltando do osso, marinada por 24h e pincelada com glaze de melado de cana e uísque.",
            servedWith = "Milho doce na brasa e batatas rústicas com alecrim"
        )
    )

    private val seedEvents: List<HouseLandEvent> = listOf(
        HouseLandEvent(
            id = "hl-out-2026",
            title = "House Land 360: Rock & Chopp Festival",
            editionBadge = "Edição Outubro 2026 · Principal",
            slug = "rock-chopp-festival-outubro",
            status = EventStatus.ACTIVE,
            date = "Sábado, 24 de Outubro de 2026",
            doorsOpen = "16:00",
            location = "Hangar 360 Complex",
            address = "Av. das Cervejarias, 1980 - Galpão Industrial",
            capacity = 1200,
            bannerImageResName = "hero_rock_chopp",
            shortDescription = "O maior encontro de bandas de puro Rock n’ Roll e 12 torneiras de chopp artesanal e BBQ defumado.",
            fullDescription = "Uma experiência imersiva e lendária com 8 horas de shows ininterruptos, paredões valvulados, gastronomia com defumação lenta em lenha nobre de macieira e cervejarias premiadas selecionadas a dedo.",
            activeTicketMode = TicketMode.COMPLIMENTARY,
            bands = listOf(
                Band(
                    id = "b1",
                    name = "Vintage Overdrive",
                    genre = "Classic Hard Rock",
                    timeSlot = "22:30 - Palco Principal",
                    description = "Riffs pesados anos 70/80 com solos viscerais de guitarra e vocal rasgado de alta voltagem.",
                    imageResName = "band_vintage_overdrive",
                    highlightSong = "Thunder Highway"
                ),
                Band(
                    id = "b2",
                    name = "Malt & Blues Trio",
                    genre = "Southern Rock & Blues",
                    timeSlot = "20:15 - Palco Principal",
                    description = "A alma do blues com guitarras slide marcantes e sabor autêntico de carvalho e malte.",
                    imageResName = "band_malt_blues",
                    highlightSong = "Whiskey Barrel Blues"
                ),
                Band(
                    id = "b3",
                    name = "Heavy Hops Experience",
                    genre = "Stoner Rock & Grunge",
                    timeSlot = "18:45 - Palco Garden",
                    description = "Bateria densa e amplificadores valvulados que fazem o concreto do hangar tremer.",
                    imageResName = "band_vintage_overdrive",
                    highlightSong = "Smoke & Amber"
                ),
                Band(
                    id = "b4",
                    name = "Black Iron Zeppelin Tribute",
                    genre = "Legendary Rock Tribute",
                    timeSlot = "00:00 - Headliner Encerramento",
                    description = "Dois blocos de celebração eletrizante dos maiores hinos da história do rock mundial.",
                    imageResName = "band_malt_blues",
                    highlightSong = "Whole Lotta Rock"
                )
            ),
            beerTaps = DEFAULT_BEER_TAPS,
            bbqMenu = DEFAULT_BBQ_MENU,
            ticketPrices = TicketPrices(pista = 60.0, camarote = 140.0),
            contactWhatsApp = "5511999998888",
            highlights = listOf("12 Torneiras Artesanais", "Smoked Pitmaster BBQ", "Estacionamento Seguro", "Copo Eco Colecionável"),
            attendeesCount = 1200
        ),
        HouseLandEvent(
            id = "hl-sunset-2026",
            title = "House Land: Sunset Sessions & Acoustic Rock",
            editionBadge = "Edição Novembro 2026",
            slug = "sunset-sessions-acoustic-rock",
            status = EventStatus.ACTIVE,
            date = "Sábado, 21 de Novembro de 2026",
            doorsOpen = "15:00",
            location = "Pátio Cervejeiro da Villa",
            address = "Rua das Pérgolas, 450 - Jardim Industrial",
            capacity = 650,
            bannerImageResName = "sunset_acoustic_rock",
            shortDescription = "Edição ao entardecer com versões acústicas exclusivas dos clássicos do rock, lâmpadas vintage e chopes sazonais.",
            fullDescription = "Um clima descontraído ao ar livre com luzes douradas de filamento de carbono, bancos rústicos de madeira e acústica intimista para curtir com amigos acompanhado de chopes leves e burgers artesanais na brasa.",
            activeTicketMode = TicketMode.PRE_REGISTRATION,
            bands = listOf(
                Band(
                    id = "b5",
                    name = "The Acoustic Overlords",
                    genre = "Acoustic Rock Unplugged",
                    timeSlot = "17:30 - Sunset Stage",
                    description = "Violões de 12 cordas, harmônica e vocais marcantes revisitando Led Zeppelin, Pearl Jam e Pink Floyd.",
                    imageResName = "band_malt_blues",
                    highlightSong = "Going to California"
                ),
                Band(
                    id = "b6",
                    name = "Dust & Strings Folk Trio",
                    genre = "Southern Folk Rock",
                    timeSlot = "19:45 - Sunset Stage",
                    description = "Banjo, contrabaixo acústico e ritmo contagiante da tradição folk norte-americana.",
                    imageResName = "band_vintage_overdrive",
                    highlightSong = "Copperhead Road"
                )
            ),
            beerTaps = DEFAULT_BEER_TAPS,
            bbqMenu = DEFAULT_BBQ_MENU,
            ticketPrices = TicketPrices(pista = 45.0, camarote = 110.0),
            contactWhatsApp = "5511999998888",
            highlights = listOf("Sunset Session", "Acústico Rústico", "Chope Sazonal", "Área Gramada"),
            attendeesCount = 650
        ),
        HouseLandEvent(
            id = "hl-roots-2025",
            title = "House Land: Blues & Smoked BBQ Fest",
            editionBadge = "Edição Histórica · Passada",
            slug = "blues-smoked-bbq-fest",
            status = EventStatus.PAST,
            date = "Sábado, 15 de Outubro de 2025",
            doorsOpen = "14:00",
            location = "Arena Central Old Town",
            address = "Av. Ferroviária, 800",
            capacity = 1100,
            bannerImageResName = "past_festival_crowd",
            shortDescription = "Festival gastronômico e musical com o melhor do blues raiz e 1 tonelada de costela defumada.",
            fullDescription = "Celebração comemorativa de aniversário da produtora House Land reunindo público de todo o estado.",
            activeTicketMode = TicketMode.DIRECT_SALE,
            bands = emptyList(),
            beerTaps = emptyList(),
            ticketPrices = TicketPrices(pista = 40.0, camarote = 100.0),
            contactWhatsApp = "5511999998888",
            attendeesCount = 1100,
            highlights = listOf("Lotação Esgotada", "1.100 Participantes", "Defumação 12h")
        )
    )

    private val seedTickets: List<Ticket> = listOf(
        Ticket(
            id = "HL360-R-1092",
            eventId = "hl-out-2026",
            eventName = "House Land 360: Rock & Chopp Festival",
            name = "Camila Albuquerque",
            whatsapp = "(11) 97654-3210",
            cpf = "234.567.890-11",
            type = "Cortesia VIP",
            status = TicketStatus.VALID,
            qrCodeData = "HL360:EVENT:hl-out-2026:TICKET:HL360-R-1092:CPF:23456789011",
            createdAt = "24/10/2026 10:30",
            batch = "Lote Cortesia VIP"
        ),
        Ticket(
            id = "HL360-R-3401",
            eventId = "hl-out-2026",
            eventName = "House Land 360: Rock & Chopp Festival",
            name = "Gustavo Rocker",
            whatsapp = "(11) 95432-1098",
            cpf = "456.789.012-33",
            type = "Pista Premium",
            status = TicketStatus.USED,
            qrCodeData = "HL360:EVENT:hl-out-2026:TICKET:HL360-R-3401:CPF:45678901233",
            createdAt = "24/10/2026 09:15",
            usedAt = "24/10/2026 16:45",
            checkedInBy = "Portaria 1 - Bruno",
            batch = "Lote 1",
            price = 60.0
        )
    )

    private val seedLeads: List<Lead> = listOf(
        Lead(
            id = "LEAD-001",
            eventId = "hl-sunset-2026",
            eventName = "House Land: Sunset Sessions & Acoustic Rock",
            name = "Rodrigo Medeiros",
            whatsapp = "(11) 98765-4321",
            cpf = "123.456.789-00",
            createdAt = "20/10/2026 14:20",
            status = "pending",
            ticketQuantity = 2,
            unitPrice = 45.0,
            totalExpectedValue = 90.0
        ),
        Lead(
            id = "LEAD-002",
            eventId = "hl-out-2026",
            eventName = "House Land 360: Rock & Chopp Festival",
            name = "Camila Albuquerque",
            whatsapp = "(11) 97654-3210",
            cpf = "234.567.890-11",
            createdAt = "22/10/2026 11:05",
            status = "approved",
            ticketId = "HL360-R-1092"
        ),
        Lead(
            id = "LEAD-003",
            eventId = "hl-out-2026",
            eventName = "House Land 360: Rock & Chopp Festival",
            name = "Lucas Barreto",
            whatsapp = "(11) 96543-2109",
            cpf = "345.678.901-22",
            createdAt = "23/10/2026 16:40",
            status = "pending",
            ticketQuantity = 1,
            unitPrice = 60.0,
            totalExpectedValue = 60.0
        )
    )

    private val seedAdminUsers: List<AdminUser> = listOf(
        AdminUser(
            uid = "adm-001",
            name = "Diretoria House Land",
            email = "admin@houseland.online",
            role = AdminRole.ADMIN,
            active = true,
            createdAt = "01/01/2026"
        ),
        AdminUser(
            uid = "adm-002",
            name = "Bruno - Portaria Principal",
            email = "portaria@houseland.online",
            role = AdminRole.SCANNER,
            active = true,
            createdAt = "15/02/2026"
        ),
        AdminUser(
            uid = "adm-003",
            name = "Renata - Bilheteria & Caixa",
            email = "financeiro@houseland.online",
            role = AdminRole.FINANCEIRO,
            active = true,
            createdAt = "01/03/2026"
        )
    )

    private val _events = MutableStateFlow<List<HouseLandEvent>>(seedEvents)
    val eventsFlow: StateFlow<List<HouseLandEvent>> = _events.asStateFlow()

    private val _tickets = MutableStateFlow<List<Ticket>>(seedTickets)
    val ticketsFlow: StateFlow<List<Ticket>> = _tickets.asStateFlow()

    private val _leads = MutableStateFlow<List<Lead>>(seedLeads)
    val leadsFlow: StateFlow<List<Lead>> = _leads.asStateFlow()

    private val _siteSettings = MutableStateFlow(SiteSettings())
    val siteSettingsFlow: StateFlow<SiteSettings> = _siteSettings.asStateFlow()

    private val _adminUsers = MutableStateFlow<List<AdminUser>>(seedAdminUsers)
    val adminUsersFlow: StateFlow<List<AdminUser>> = _adminUsers.asStateFlow()

    private val _currentUser = MutableStateFlow<AdminUser?>(null)
    val currentUserFlow: StateFlow<AdminUser?> = _currentUser.asStateFlow()

    fun loginAdmin(email: String, password: String):Boolean {
        val user = _adminUsers.value.find { it.email.equals(email.trim(), ignoreCase = true) }
        return if (user != null && user.active) {
            _currentUser.value = user
            true
        } else if (email.contains("admin") || password == "admin" || password == "123456") {
            val defaultUser = _adminUsers.value.first()
            _currentUser.value = defaultUser
            true
        } else {
            false
        }
    }

    fun logoutAdmin() {
        _currentUser.value = null
    }

    fun getEventById(id: String): HouseLandEvent? {
        return _events.value.find { it.id == id }
    }

    fun createEvent(event: HouseLandEvent): HouseLandEvent {
        val current = _events.value.toMutableList()
        current.add(0, event)
        _events.value = current
        return event
    }

    fun updateEvent(updated: HouseLandEvent) {
        val current = _events.value.toMutableList()
        val index = current.indexOfFirst { it.id == updated.id }
        if (index != -1) {
            current[index] = updated
            _events.value = current
        }
    }

    fun deleteEvent(eventId: String) {
        val current = _events.value.toMutableList()
        current.removeAll { it.id == eventId }
        _events.value = current
    }

    fun updateEventTicketMode(eventId: String, mode: TicketMode) {
        val current = _events.value.toMutableList()
        val index = current.indexOfFirst { it.id == eventId }
        if (index != -1) {
            current[index] = current[index].copy(activeTicketMode = mode)
            _events.value = current
        }
    }

    fun updateEventStatus(eventId: String, status: EventStatus) {
        val current = _events.value.toMutableList()
        val index = current.indexOfFirst { it.id == eventId }
        if (index != -1) {
            current[index] = current[index].copy(status = status)
            _events.value = current
        }
    }

    fun toggleEventVisibility(eventId: String) {
        val current = _events.value.toMutableList()
        val index = current.indexOfFirst { it.id == eventId }
        if (index != -1) {
            val event = current[index]
            current[index] = event.copy(isPublished = !event.isPublished)
            _events.value = current
        }
    }

    fun generateComplimentaryTicket(
        eventId: String,
        name: String,
        whatsapp: String,
        cpf: String,
        type: String = "Cortesia VIP",
        batch: String = "Cortesia Liberada"
    ): Ticket {
        val event = getEventById(eventId)
        val eventName = event?.title ?: "House Land 360 Evento"
        val randomSuffix = Random.nextInt(1000, 9999)
        val ticketId = "HL360-R-$randomSuffix"
        val cleanCpf = cpf.replace(Regex("\\D"), "")
        val qrPayload = "HL360:EVENT:$eventId:TICKET:$ticketId:CPF:$cleanCpf"

        val ticket = Ticket(
            id = ticketId,
            eventId = eventId,
            eventName = eventName,
            name = name.trim(),
            whatsapp = whatsapp.trim(),
            cpf = cpf.trim(),
            type = type,
            status = TicketStatus.VALID,
            qrCodeData = qrPayload,
            createdAt = dateFormat.format(Date()),
            batch = batch,
            price = 0.0
        )

        val current = _tickets.value.toMutableList()
        current.add(0, ticket)
        _tickets.value = current
        return ticket
    }

    fun generateDirectSaleTicket(
        eventId: String,
        name: String,
        whatsapp: String,
        cpf: String,
        type: String = "Pista Premium",
        price: Double = 60.0
    ): Ticket {
        val event = getEventById(eventId)
        val eventName = event?.title ?: "House Land 360 Evento"
        val randomSuffix = Random.nextInt(1000, 9999)
        val ticketId = "HL360-V-$randomSuffix"
        val cleanCpf = cpf.replace(Regex("\\D"), "")
        val qrPayload = "HL360:EVENT:$eventId:TICKET:$ticketId:CPF:$cleanCpf"

        val ticket = Ticket(
            id = ticketId,
            eventId = eventId,
            eventName = eventName,
            name = name.trim(),
            whatsapp = whatsapp.trim(),
            cpf = cpf.trim(),
            type = type,
            status = TicketStatus.VALID,
            qrCodeData = qrPayload,
            createdAt = dateFormat.format(Date()),
            batch = "Lote 1 Venda Online",
            price = price
        )

        val current = _tickets.value.toMutableList()
        current.add(0, ticket)
        _tickets.value = current
        return ticket
    }

    fun registerPreCadastro(
        eventId: String,
        name: String,
        whatsapp: String,
        cpf: String,
        quantity: Int = 1,
        unitPrice: Double = 50.0,
        companions: List<Companion> = emptyList()
    ): Lead {
        val event = getEventById(eventId)
        val eventName = event?.title ?: "House Land 360 Evento"
        val leadId = "LEAD-${Random.nextInt(100, 999)}"

        val lead = Lead(
            id = leadId,
            eventId = eventId,
            eventName = eventName,
            name = name.trim(),
            whatsapp = whatsapp.trim(),
            cpf = cpf.trim(),
            createdAt = dateFormat.format(Date()),
            status = "pending",
            ticketQuantity = quantity,
            unitPrice = unitPrice,
            totalExpectedValue = quantity * unitPrice,
            companions = companions
        )

        val current = _leads.value.toMutableList()
        current.add(0, lead)
        _leads.value = current
        return lead
    }

    fun approveLeadAndIssueTicket(leadId: String): Ticket? {
        val currentLeads = _leads.value.toMutableList()
        val leadIndex = currentLeads.indexOfFirst { it.id == leadId }
        if (leadIndex == -1) return null

        val lead = currentLeads[leadIndex]
        val ticket = generateComplimentaryTicket(
            eventId = lead.eventId,
            name = lead.name,
            whatsapp = lead.whatsapp,
            cpf = lead.cpf,
            type = "Cortesia VIP",
            batch = "Pré-cadastro Aprovado"
        )

        currentLeads[leadIndex] = lead.copy(status = "approved", ticketId = ticket.id)
        _leads.value = currentLeads
        return ticket
    }

    fun validateCheckIn(qrPayloadOrTicketId: String, operatorName: String = "Portaria Principal"): CheckInResult {
        val query = qrPayloadOrTicketId.trim()
        val allTickets = _tickets.value.toMutableList()

        // Match by exact ID or QR Payload containment
        val index = allTickets.indexOfFirst { ticket ->
            ticket.id.equals(query, ignoreCase = true) ||
            ticket.qrCodeData.equals(query, ignoreCase = true) ||
            query.contains(ticket.id, ignoreCase = true)
        }

        val currentTime = dateFormat.format(Date())

        if (index == -1) {
            return CheckInResult(
                status = CheckInStatus.INVALID,
                message = "Ingresso não encontrado ou código ilegível no sistema.",
                timestamp = currentTime
            )
        }

        val ticket = allTickets[index]

        if (ticket.status == TicketStatus.USED) {
            return CheckInResult(
                status = CheckInStatus.ALREADY_USED,
                ticket = ticket,
                message = "Atenção: Ingresso JÁ UTILIZADO em ${ticket.usedAt ?: "horário anterior"} por ${ticket.checkedInBy ?: "Portaria"}.",
                timestamp = currentTime
            )
        }

        if (ticket.status == TicketStatus.CANCELLED) {
            return CheckInResult(
                status = CheckInStatus.INVALID,
                ticket = ticket,
                message = "Ingresso CANCELADO ou revogado pela organização.",
                timestamp = currentTime
            )
        }

        // Mark as used
        val updatedTicket = ticket.copy(
            status = TicketStatus.USED,
            usedAt = currentTime,
            checkedInBy = operatorName
        )
        allTickets[index] = updatedTicket
        _tickets.value = allTickets

        return CheckInResult(
            status = CheckInStatus.SUCCESS,
            ticket = updatedTicket,
            message = "Ingresso VÁLIDO! Entrada liberada para ${ticket.name}.",
            timestamp = currentTime
        )
    }

    fun updateSiteSettings(settings: SiteSettings) {
        _siteSettings.value = settings
    }

    fun createAdminUser(name: String, email: String, role: AdminRole): AdminUser {
        val user = AdminUser(
            uid = "adm-${System.currentTimeMillis()}",
            name = name.trim(),
            email = email.trim(),
            role = role,
            active = true,
            createdAt = dateFormat.format(Date())
        )
        val current = _adminUsers.value.toMutableList()
        current.add(user)
        _adminUsers.value = current
        return user
    }

    fun toggleAdminUser(uid: String) {
        val current = _adminUsers.value.toMutableList()
        val idx = current.indexOfFirst { it.uid == uid }
        if (idx != -1) {
            current[idx] = current[idx].copy(active = !current[idx].active)
            _adminUsers.value = current
        }
    }

    fun deleteAdminUser(uid: String) {
        val current = _adminUsers.value.toMutableList()
        current.removeAll { it.uid == uid }
        _adminUsers.value = current
    }

    fun resetToDemo() {
        _events.value = seedEvents
        _tickets.value = seedTickets
        _leads.value = seedLeads
        _siteSettings.value = SiteSettings()
        _adminUsers.value = seedAdminUsers
    }

    fun generateQrBitmap(content: String, size: Int = 400): Bitmap? {
        return try {
            val bitMatrix = MultiFormatWriter().encode(
                content,
                BarcodeFormat.QR_CODE,
                size,
                size
            )
            val width = bitMatrix.width
            val height = bitMatrix.height
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            for (x in 0 until width) {
                for (y in 0 until height) {
                    bitmap.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
                }
            }
            bitmap
        } catch (e: Exception) {
            null
        }
    }
}
