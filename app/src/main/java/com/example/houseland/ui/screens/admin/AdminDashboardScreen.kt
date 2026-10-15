package com.example.houseland.ui.screens.admin

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.houseland.data.model.*
import com.example.houseland.data.repository.HouseLandRepository
import com.example.houseland.ui.components.GlassCard
import com.example.houseland.ui.components.MaltButton
import com.example.houseland.ui.components.StatusBadgeView
import com.example.houseland.ui.components.TicketModeBadgeView
import com.example.houseland.ui.theme.*

@Composable
fun AdminDashboardScreen(
    onExitToPortal: () -> Unit
) {
    val context = LocalContext.current
    val currentUser by HouseLandRepository.currentUserFlow.collectAsState()

    if (currentUser == null) {
        AdminLoginView(
            onLoginSuccess = {},
            onBackToPortal = onExitToPortal
        )
    } else {
        AdminPanelContent(
            currentUser = currentUser!!,
            onLogout = {
                HouseLandRepository.logoutAdmin()
                onExitToPortal()
            }
        )
    }
}

@Composable
private fun AdminLoginView(
    onLoginSuccess: () -> Unit,
    onBackToPortal: () -> Unit
) {
    var email by remember { mutableStateOf("admin@houseland.online") }
    var password by remember { mutableStateOf("123456") }
    var errorMessage by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDark)
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, BorderGlass, RoundedCornerShape(20.dp)),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = SurfaceDark)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .background(AmberPrimary.copy(alpha = 0.15f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Lock,
                        contentDescription = "Admin",
                        tint = AmberPrimary,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = "ACESSO ADMINISTRATIVO",
                    style = MaterialTheme.typography.titleLarge,
                    color = TextPrimary,
                    fontWeight = FontWeight.Black
                )

                Text(
                    text = "House Land 360 • Bilheteria & Gestão",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )

                Spacer(modifier = Modifier.height(18.dp))

                if (errorMessage.isNotBlank()) {
                    Text(
                        text = "⚠️ $errorMessage",
                        color = StatusRed,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(StatusRedBg, RoundedCornerShape(8.dp))
                            .padding(10.dp)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                }

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("E-mail do Administrador") },
                    modifier = Modifier.fillMaxWidth().testTag("input_admin_email"),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AmberPrimary,
                        unfocusedBorderColor = BorderSubtle,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    )
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Senha de Acesso") },
                    modifier = Modifier.fillMaxWidth().testTag("input_admin_password"),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = AmberPrimary,
                        unfocusedBorderColor = BorderSubtle,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary
                    )
                )

                Spacer(modifier = Modifier.height(18.dp))

                MaltButton(
                    text = "Entrar no Painel",
                    onClick = {
                        val success = HouseLandRepository.loginAdmin(email, password)
                        if (success) {
                            onLoginSuccess()
                        } else {
                            errorMessage = "Credenciais inválidas ou usuário inativo."
                        }
                    },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(14.dp))

                TextButton(
                    onClick = onBackToPortal,
                    modifier = Modifier.testTag("btn_back_portal")
                ) {
                    Text("← Voltar ao Portal Público", color = TextSecondary)
                }
            }
        }
    }
}

@Composable
private fun AdminPanelContent(
    currentUser: AdminUser,
    onLogout: () -> Unit
) {
    var selectedTab by remember { mutableStateOf("events") } // "events", "participants", "cms", "team"
    val events by HouseLandRepository.eventsFlow.collectAsState()
    val tickets by HouseLandRepository.ticketsFlow.collectAsState()
    val leads by HouseLandRepository.leadsFlow.collectAsState()
    val siteSettings by HouseLandRepository.siteSettingsFlow.collectAsState()
    val adminUsers by HouseLandRepository.adminUsersFlow.collectAsState()

    var showCreateEventDialog by remember { mutableStateOf(false) }
    var showManualVipDialog by remember { mutableStateOf(false) }

    Scaffold(
        containerColor = BackgroundDark,
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceDark)
                    .border(1.dp, BorderSubtle)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "PAINEL ADMINISTRATIVO",
                            style = MaterialTheme.typography.titleMedium,
                            color = AmberPrimary,
                            fontWeight = FontWeight.Black
                        )
                        Text(
                            text = "${currentUser.name} (${currentUser.role.label})",
                            style = MaterialTheme.typography.labelSmall,
                            color = TextSecondary
                        )
                    }

                    IconButton(
                        onClick = onLogout,
                        modifier = Modifier
                            .size(36.dp)
                            .background(SurfaceElevated, CircleShape)
                    ) {
                        Icon(
                            imageVector = Icons.Default.ExitToApp,
                            contentDescription = "Sair",
                            tint = AmberPrimary
                        )
                    }
                }

                // Tab Selector
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    item {
                        FilterChip(
                            selected = selectedTab == "events",
                            onClick = { selectedTab = "events" },
                            label = { Text("Edições (${events.size})") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = selectedTab == "participants",
                            onClick = { selectedTab = "participants" },
                            label = { Text("Participantes (${tickets.size + leads.size})") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = selectedTab == "cms",
                            onClick = { selectedTab = "cms" },
                            label = { Text("Editor do Site") }
                        )
                    }
                    item {
                        FilterChip(
                            selected = selectedTab == "team",
                            onClick = { selectedTab = "team" },
                            label = { Text("Equipe (${adminUsers.size})") }
                        )
                    }
                }
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (selectedTab) {
                "events" -> {
                    AdminEventsTab(
                        events = events,
                        onOpenCreate = { showCreateEventDialog = true }
                    )
                }
                "participants" -> {
                    AdminParticipantsTab(
                        tickets = tickets,
                        leads = leads,
                        onOpenManualVip = { showManualVipDialog = true }
                    )
                }
                "cms" -> {
                    AdminCmsTab(siteSettings = siteSettings)
                }
                "team" -> {
                    AdminTeamTab(adminUsers = adminUsers)
                }
            }
        }
    }

    // Modal Create Event
    if (showCreateEventDialog) {
        CreateEventDialog(onDismiss = { showCreateEventDialog = false })
    }

    // Modal Manual VIP
    if (showManualVipDialog) {
        ManualVipDialog(
            events = events,
            onDismiss = { showManualVipDialog = false }
        )
    }
}

@Composable
private fun AdminEventsTab(
    events: List<HouseLandEvent>,
    onOpenCreate: () -> Unit
) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "GERENCIADOR DE EDIÇÕES",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )

                MaltButton(
                    text = "+ Nova Edição",
                    onClick = onOpenCreate,
                    modifier = Modifier.height(40.dp)
                )
            }
        }

        items(events) { event ->
            GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = SurfaceDark) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = event.title,
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary
                        )
                        Text(
                            text = "${event.date} • ${event.location}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )
                    }

                    Switch(
                        checked = event.isPublished,
                        onCheckedChange = { HouseLandRepository.toggleEventVisibility(event.id) }
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TicketModeBadgeView(mode = event.activeTicketMode)

                    Spacer(modifier = Modifier.weight(1f))

                    // Change mode buttons
                    OutlinedButton(
                        onClick = {
                            val nextMode = when (event.activeTicketMode) {
                                TicketMode.COMPLIMENTARY -> TicketMode.PRE_REGISTRATION
                                TicketMode.PRE_REGISTRATION -> TicketMode.DIRECT_SALE
                                TicketMode.DIRECT_SALE -> TicketMode.COMPLIMENTARY
                            }
                            HouseLandRepository.updateEventTicketMode(event.id, nextMode)
                        },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.height(34.dp),
                        contentPadding = PaddingValues(horizontal = 8.dp)
                    ) {
                        Text("Mudar Modo", fontSize = 10.sp, color = AmberPrimary)
                    }

                    IconButton(
                        onClick = { HouseLandRepository.deleteEvent(event.id) },
                        modifier = Modifier.size(34.dp)
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = "Excluir", tint = StatusRed, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminParticipantsTab(
    tickets: List<Ticket>,
    leads: List<Lead>,
    onOpenManualVip: () -> Unit
) {
    val context = LocalContext.current
    var filter by remember { mutableStateOf("all") } // "all", "valid", "used", "leads"
    var searchQuery by remember { mutableStateOf("") }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "PARTICIPANTES & INGRESSOS",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )

                MaltButton(
                    text = "+ Cortesia VIP",
                    onClick = onOpenManualVip,
                    modifier = Modifier.height(40.dp)
                )
            }
        }

        item {
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Buscar por Nome, CPF ou ID...") },
                modifier = Modifier.fillMaxWidth(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = AmberPrimary,
                    unfocusedBorderColor = BorderSubtle,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary
                ),
                singleLine = true
            )
        }

        // Filter chips
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = filter == "all",
                    onClick = { filter = "all" },
                    label = { Text("Todos (${tickets.size + leads.size})") }
                )
                FilterChip(
                    selected = filter == "valid",
                    onClick = { filter = "valid" },
                    label = { Text("Válidos (${tickets.count { it.status == TicketStatus.VALID }})") }
                )
                FilterChip(
                    selected = filter == "used",
                    onClick = { filter = "used" },
                    label = { Text("Usados (${tickets.count { it.status == TicketStatus.USED }})") }
                )
                FilterChip(
                    selected = filter == "leads",
                    onClick = { filter = "leads" },
                    label = { Text("Leads (${leads.size})") }
                )
            }
        }

        // Leads items
        if (filter == "all" || filter == "leads") {
            val filteredLeads = leads.filter {
                it.name.contains(searchQuery, ignoreCase = true) ||
                it.cpf.contains(searchQuery) ||
                it.id.contains(searchQuery, ignoreCase = true)
            }

            items(filteredLeads) { lead ->
                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = Color(0xFF14151D)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = "LEAD: ${lead.name}", style = MaterialTheme.typography.titleMedium, color = AmberPrimary)
                            Text(text = "WhatsApp: ${lead.whatsapp} • CPF: ${lead.cpf}", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                            Text(text = "Evento: ${lead.eventName}", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                        }

                        if (lead.status == "pending") {
                            MaltButton(
                                text = "Aprovar VIP",
                                onClick = {
                                    val t = HouseLandRepository.approveLeadAndIssueTicket(lead.id)
                                    if (t != null) {
                                        Toast.makeText(context, "Ingresso gerado: ${t.id}", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                modifier = Modifier.height(36.dp)
                            )
                        } else {
                            Text(text = "APROVADO", color = StatusGreen, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Tickets items
        if (filter != "leads") {
            val filteredTickets = tickets.filter { ticket ->
                val matchesQuery = ticket.name.contains(searchQuery, ignoreCase = true) ||
                        ticket.cpf.contains(searchQuery) ||
                        ticket.id.contains(searchQuery, ignoreCase = true)
                val matchesFilter = when (filter) {
                    "valid" -> ticket.status == TicketStatus.VALID
                    "used" -> ticket.status == TicketStatus.USED
                    else -> true
                }
                matchesQuery && matchesFilter
            }

            items(filteredTickets) { ticket ->
                GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = SurfaceDark) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(text = ticket.name, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                            Text(text = "ID: ${ticket.id} • ${ticket.type}", style = MaterialTheme.typography.bodyMedium, color = TextSecondary, fontFamily = FontFamily.Monospace)
                            Text(text = "CPF: ${ticket.cpf} • Emitido em: ${ticket.createdAt}", style = MaterialTheme.typography.labelSmall, color = TextMuted)
                            if (ticket.usedAt != null) {
                                Text(text = "Entrada: ${ticket.usedAt} (${ticket.checkedInBy})", style = MaterialTheme.typography.labelSmall, color = AmberPrimary)
                            }
                        }

                        StatusBadgeView(status = ticket.status)
                    }
                }
            }
        }
    }
}

@Composable
private fun AdminCmsTab(siteSettings: SiteSettings) {
    val context = LocalContext.current
    var brandName by remember { mutableStateOf(siteSettings.brandName) }
    var brandSubtitle by remember { mutableStateOf(siteSettings.brandSubtitle) }
    var heroTitle by remember { mutableStateOf(siteSettings.heroTitle) }
    var heroSubtitle by remember { mutableStateOf(siteSettings.heroSubtitle) }
    var whatsapp by remember { mutableStateOf(siteSettings.contactWhatsapp) }
    var showCountdown by remember { mutableStateOf(siteSettings.showCountdown) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Text(
                text = "EDITOR VISUAL & CMS",
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary
            )
        }

        item {
            OutlinedTextField(
                value = brandName,
                onValueChange = { brandName = it },
                label = { Text("Nome da Marca") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            OutlinedTextField(
                value = brandSubtitle,
                onValueChange = { brandSubtitle = it },
                label = { Text("Subtítulo da Marca") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            OutlinedTextField(
                value = heroTitle,
                onValueChange = { heroTitle = it },
                label = { Text("Título do Hero Banner") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            OutlinedTextField(
                value = heroSubtitle,
                onValueChange = { heroSubtitle = it },
                label = { Text("Subtítulo do Hero Banner") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            OutlinedTextField(
                value = whatsapp,
                onValueChange = { whatsapp = it },
                label = { Text("WhatsApp de Contato") },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Exibir Cronômetro Regressivo", color = TextPrimary)
                Switch(checked = showCountdown, onCheckedChange = { showCountdown = it })
            }
        }

        item {
            MaltButton(
                text = "Salvar Alterações no Site",
                onClick = {
                    HouseLandRepository.updateSiteSettings(
                        siteSettings.copy(
                            brandName = brandName,
                            brandSubtitle = brandSubtitle,
                            heroTitle = heroTitle,
                            heroSubtitle = heroSubtitle,
                            contactWhatsapp = whatsapp,
                            showCountdown = showCountdown
                        )
                    )
                    Toast.makeText(context, "Configurações salvas!", Toast.LENGTH_SHORT).show()
                },
                modifier = Modifier.fillMaxWidth()
            )
        }

        item {
            Spacer(modifier = Modifier.height(10.dp))
            OutlinedButton(
                onClick = {
                    HouseLandRepository.resetToDemo()
                    Toast.makeText(context, "Banco restaurado para demonstração!", Toast.LENGTH_SHORT).show()
                },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text("Restaurar Banco de Dados Demo", color = StatusRed)
            }
        }
    }
}

@Composable
private fun AdminTeamTab(adminUsers: List<AdminUser>) {
    val context = LocalContext.current
    var showAddUserDialog by remember { mutableStateOf(false) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "EQUIPE & PERMISSÕES",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )

                MaltButton(
                    text = "+ Usuário",
                    onClick = { showAddUserDialog = true },
                    modifier = Modifier.height(40.dp)
                )
            }
        }

        items(adminUsers) { user ->
            GlassCard(modifier = Modifier.fillMaxWidth(), backgroundColor = SurfaceDark) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(text = user.name, style = MaterialTheme.typography.titleMedium, color = TextPrimary)
                        Text(text = user.email, style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                        Text(text = "Papel: ${user.role.label}", style = MaterialTheme.typography.labelSmall, color = AmberPrimary)
                    }

                    Switch(
                        checked = user.active,
                        onCheckedChange = { HouseLandRepository.toggleAdminUser(user.uid) }
                    )
                }
            }
        }
    }

    if (showAddUserDialog) {
        var newName by remember { mutableStateOf("") }
        var newEmail by remember { mutableStateOf("") }
        var selectedRole by remember { mutableStateOf(AdminRole.ADMIN) }

        AlertDialog(
            onDismissRequest = { showAddUserDialog = false },
            title = { Text("Novo Usuário da Equipe", color = AmberPrimary) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(value = newName, onValueChange = { newName = it }, label = { Text("Nome") })
                    OutlinedTextField(value = newEmail, onValueChange = { newEmail = it }, label = { Text("E-mail") })
                }
            },
            confirmButton = {
                Button(onClick = {
                    if (newName.isNotBlank() && newEmail.isNotBlank()) {
                        HouseLandRepository.createAdminUser(newName, newEmail, selectedRole)
                        showAddUserDialog = false
                    }
                }) {
                    Text("Adicionar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddUserDialog = false }) { Text("Cancelar") }
            }
        )
    }
}

@Composable
private fun CreateEventDialog(onDismiss: () -> Unit) {
    var title by remember { mutableStateOf("") }
    var editionBadge by remember { mutableStateOf("Edição 2027") }
    var date by remember { mutableStateOf("Sábado, 10 de Abril de 2027") }
    var location by remember { mutableStateOf("Hangar 360 Complex") }
    var capacity by remember { mutableStateOf("1000") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Criar Nova Edição", color = AmberPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = title, onValueChange = { title = it }, label = { Text("Título da Edição") })
                OutlinedTextField(value = editionBadge, onValueChange = { editionBadge = it }, label = { Text("Badge de Identificação") })
                OutlinedTextField(value = date, onValueChange = { date = it }, label = { Text("Data do Evento") })
                OutlinedTextField(value = location, onValueChange = { location = it }, label = { Text("Local") })
                OutlinedTextField(value = capacity, onValueChange = { capacity = it }, label = { Text("Capacidade de Público") })
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        val newEvt = HouseLandEvent(
                            id = "hl-event-${System.currentTimeMillis()}",
                            title = title,
                            editionBadge = editionBadge,
                            slug = title.lowercase().replace(" ", "-"),
                            status = EventStatus.ACTIVE,
                            date = date,
                            doorsOpen = "16:00",
                            location = location,
                            address = "Av. das Cervejarias, 1980",
                            capacity = capacity.toIntOrNull() ?: 1000,
                            bannerImageResName = "hero_rock_chopp",
                            shortDescription = "Nova edição lendária de puro Rock e Chopp.",
                            fullDescription = "Venha curtir o melhor do rock n roll com chopp artesanal e churrasco defumado.",
                            activeTicketMode = TicketMode.PRE_REGISTRATION,
                            highlights = listOf("Rock ao Vivo", "Chopp Artesanal", "Churrasco na Brasa")
                        )
                        HouseLandRepository.createEvent(newEvt)
                        onDismiss()
                    }
                }
            ) {
                Text("Criar Edição")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}

@Composable
private fun ManualVipDialog(
    events: List<HouseLandEvent>,
    onDismiss: () -> Unit
) {
    var selectedEventId by remember { mutableStateOf(events.firstOrNull()?.id ?: "") }
    var name by remember { mutableStateOf("") }
    var whatsapp by remember { mutableStateOf("") }
    var cpf by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Emitir Cortesia VIP Manual", color = AmberPrimary) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(value = name, onValueChange = { name = it }, label = { Text("Nome do Convidado VIP") })
                OutlinedTextField(value = whatsapp, onValueChange = { whatsapp = it }, label = { Text("WhatsApp") })
                OutlinedTextField(value = cpf, onValueChange = { cpf = it }, label = { Text("CPF") })
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (name.isNotBlank() && cpf.isNotBlank() && selectedEventId.isNotBlank()) {
                        HouseLandRepository.generateComplimentaryTicket(
                            eventId = selectedEventId,
                            name = name,
                            whatsapp = whatsapp,
                            cpf = cpf,
                            type = "Cortesia VIP Manual",
                            batch = "Cortesia Produção"
                        )
                        onDismiss()
                    }
                }
            ) {
                Text("Emitir Ingresso")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        }
    )
}
