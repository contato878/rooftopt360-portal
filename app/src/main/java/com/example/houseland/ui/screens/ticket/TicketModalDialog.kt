package com.example.houseland.ui.screens.ticket

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Bitmap
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.houseland.data.model.*
import com.example.houseland.data.repository.HouseLandRepository
import com.example.houseland.ui.components.GlassCard
import com.example.houseland.ui.components.MaltButton
import com.example.houseland.ui.components.QrCodeBitmapImage
import com.example.houseland.ui.theme.*

@Composable
fun TicketModalDialog(
    event: HouseLandEvent,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    var currentStep by remember { mutableStateOf("selection") } // "selection", "form", "success"
    var quantity by remember { mutableIntStateOf(1) }
    var selectedSector by remember { mutableStateOf("Pista Premium") }

    // Form fields
    var name by remember { mutableStateOf("") }
    var whatsapp by remember { mutableStateOf("") }
    var cpf by remember { mutableStateOf("") }
    var errorMessage by remember { mutableStateOf("") }

    // Companions (for quantity > 1)
    val companions = remember { mutableStateListOf<Companion>() }

    // Update companions list when quantity changes
    LaunchedEffect(quantity) {
        val needed = (quantity - 1).coerceAtLeast(0)
        while (companions.size < needed) {
            companions.add(Companion(name = "", cpf = ""))
        }
        while (companions.size > needed) {
            companions.removeLastOrNull()
        }
    }

    // Success outcome
    var issuedTicket by remember { mutableStateOf<Ticket?>(null) }
    var qrBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var registeredLead by remember { mutableStateOf<Lead?>(null) }
    var paymentDone by remember { mutableStateOf(false) }

    val unitPrice = if (selectedSector == "Camarote Chopp Open") event.ticketPrices.camarote else event.ticketPrices.pista
    val totalPrice = quantity * unitPrice

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.85f))
                .padding(16.dp),
            contentAlignment = Alignment.Center
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.92f)
                    .border(1.dp, BorderGlass, RoundedCornerShape(24.dp)),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceDark)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(20.dp)
                ) {
                    // Header with Close
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = when (event.activeTicketMode) {
                                    TicketMode.COMPLIMENTARY -> "RESGATE DE CORTESIA VIP"
                                    TicketMode.PRE_REGISTRATION -> "PRÉ-CADASTRO & FILA VIP"
                                    TicketMode.DIRECT_SALE -> "COMPRA DE INGRESSOS"
                                },
                                style = MaterialTheme.typography.titleLarge,
                                color = AmberPrimary
                            )
                            Text(
                                text = event.title,
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary
                            )
                        }

                        IconButton(
                            onClick = onDismiss,
                            modifier = Modifier
                                .size(36.dp)
                                .background(SurfaceElevated, CircleShape)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Fechar",
                                tint = TextSecondary
                            )
                        }
                    }

                    HorizontalDivider(
                        color = Color(0x223E4050),
                        modifier = Modifier.padding(vertical = 14.dp)
                    )

                    // Body Content
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .verticalScroll(rememberScrollState())
                    ) {
                        when (currentStep) {
                            "selection" -> {
                                SelectionStep(
                                    event = event,
                                    quantity = quantity,
                                    onQuantityChange = { quantity = it },
                                    selectedSector = selectedSector,
                                    onSectorChange = { selectedSector = it },
                                    unitPrice = unitPrice,
                                    totalPrice = totalPrice,
                                    onNext = { currentStep = "form" }
                                )
                            }
                            "form" -> {
                                FormStep(
                                    event = event,
                                    name = name,
                                    onNameChange = { name = it },
                                    whatsapp = whatsapp,
                                    onWhatsappChange = { whatsapp = it },
                                    cpf = cpf,
                                    onCpfChange = { cpf = it },
                                    companions = companions,
                                    onCompanionChange = { idx, comp -> companions[idx] = comp },
                                    errorMessage = errorMessage,
                                    totalPrice = totalPrice,
                                    onBack = { currentStep = "selection" },
                                    onSubmit = {
                                        if (name.isBlank() || whatsapp.isBlank() || cpf.isBlank()) {
                                            errorMessage = "Preencha todos os campos obrigatórios do titular."
                                            return@FormStep
                                        }

                                        when (event.activeTicketMode) {
                                            TicketMode.COMPLIMENTARY -> {
                                                val ticket = HouseLandRepository.generateComplimentaryTicket(
                                                    eventId = event.id,
                                                    name = name,
                                                    whatsapp = whatsapp,
                                                    cpf = cpf,
                                                    type = "Cortesia VIP",
                                                    batch = "Cortesia Liberada"
                                                )
                                                issuedTicket = ticket
                                                qrBitmap = HouseLandRepository.generateQrBitmap(ticket.qrCodeData)
                                                currentStep = "success"
                                            }
                                            TicketMode.PRE_REGISTRATION -> {
                                                val lead = HouseLandRepository.registerPreCadastro(
                                                    eventId = event.id,
                                                    name = name,
                                                    whatsapp = whatsapp,
                                                    cpf = cpf,
                                                    quantity = quantity,
                                                    unitPrice = unitPrice,
                                                    companions = companions.toList()
                                                )
                                                registeredLead = lead
                                                currentStep = "success"
                                            }
                                            TicketMode.DIRECT_SALE -> {
                                                currentStep = "payment"
                                            }
                                        }
                                    }
                                )
                            }
                            "payment" -> {
                                PaymentStep(
                                    event = event,
                                    totalPrice = totalPrice,
                                    name = name,
                                    onSimulatePayment = {
                                        val ticket = HouseLandRepository.generateDirectSaleTicket(
                                            eventId = event.id,
                                            name = name,
                                            whatsapp = whatsapp,
                                            cpf = cpf,
                                            type = selectedSector,
                                            price = totalPrice
                                        )
                                        issuedTicket = ticket
                                        qrBitmap = HouseLandRepository.generateQrBitmap(ticket.qrCodeData)
                                        paymentDone = true
                                        currentStep = "success"
                                    }
                                )
                            }
                            "success" -> {
                                SuccessStep(
                                    event = event,
                                    ticket = issuedTicket,
                                    qrBitmap = qrBitmap,
                                    lead = registeredLead,
                                    onFinish = onDismiss
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SelectionStep(
    event: HouseLandEvent,
    quantity: Int,
    onQuantityChange: (Int) -> Unit,
    selectedSector: String,
    onSectorChange: (String) -> Unit,
    unitPrice: Double,
    totalPrice: Double,
    onNext: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "1. SELECIONE A QUANTIDADE & SETOR",
            style = MaterialTheme.typography.titleMedium,
            color = TextPrimary
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Sector choice (if direct sale or pre-reg)
        GlassCard(
            modifier = Modifier.fillMaxWidth(),
            backgroundColor = SurfaceElevated
        ) {
            Text(
                text = "Escolha o Setor do Evento",
                style = MaterialTheme.typography.labelSmall,
                color = AmberPrimary
            )
            Spacer(modifier = Modifier.height(10.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                SectorCard(
                    title = "Pista Premium",
                    price = "R$ ${event.ticketPrices.pista.toInt()},00",
                    selected = selectedSector == "Pista Premium",
                    modifier = Modifier.weight(1f),
                    onClick = { onSectorChange("Pista Premium") }
                )

                SectorCard(
                    title = "Camarote Open",
                    price = "R$ ${event.ticketPrices.camarote.toInt()},00",
                    selected = selectedSector == "Camarote Chopp Open",
                    modifier = Modifier.weight(1f),
                    onClick = { onSectorChange("Camarote Chopp Open") }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Quantity selector
        GlassCard(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "Quantidade de Ingressos",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary
                    )
                    Text(
                        text = "Máximo de 4 por CPF",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextMuted
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    IconButton(
                        onClick = { if (quantity > 1) onQuantityChange(quantity - 1) },
                        modifier = Modifier
                            .size(38.dp)
                            .background(SurfaceElevated, CircleShape)
                            .border(1.dp, BorderGlass, CircleShape)
                    ) {
                        Icon(Icons.Default.Remove, contentDescription = "Diminuir", tint = AmberPrimary)
                    }

                    Text(
                        text = "$quantity",
                        style = MaterialTheme.typography.headlineMedium,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )

                    IconButton(
                        onClick = { if (quantity < 4) onQuantityChange(quantity + 1) },
                        modifier = Modifier
                            .size(38.dp)
                            .background(SurfaceElevated, CircleShape)
                            .border(1.dp, BorderGlass, CircleShape)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = "Aumentar", tint = AmberPrimary)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Total Summary
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(SurfaceElevated, RoundedCornerShape(14.dp))
                .border(1.dp, BorderGlass, RoundedCornerShape(14.dp))
                .padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "VALOR TOTAL PREVISTO",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextMuted
                )
                Text(
                    text = if (event.activeTicketMode == TicketMode.COMPLIMENTARY) "GRATUITO (CORTESIA)" else "R$ ${totalPrice.toInt()},00",
                    style = MaterialTheme.typography.headlineSmall,
                    color = AmberPrimary,
                    fontWeight = FontWeight.Bold
                )
            }

            MaltButton(
                text = "Avançar →",
                onClick = onNext,
                modifier = Modifier.width(140.dp)
            )
        }
    }
}

@Composable
private fun SectorCard(
    title: String,
    price: String,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(if (selected) AmberPrimary.copy(alpha = 0.15f) else SurfaceDark)
            .border(
                1.dp,
                if (selected) AmberPrimary else BorderSubtle,
                RoundedCornerShape(14.dp)
            )
            .clickable(onClick = onClick)
            .padding(12.dp)
    ) {
        Column {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = if (selected) AmberPrimary else TextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = price,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold,
                color = if (selected) Color.White else TextSecondary
            )
        }
    }
}

@Composable
private fun FormStep(
    event: HouseLandEvent,
    name: String,
    onNameChange: (String) -> Unit,
    whatsapp: String,
    onWhatsappChange: (String) -> Unit,
    cpf: String,
    onCpfChange: (String) -> Unit,
    companions: List<Companion>,
    onCompanionChange: (Int, Companion) -> Unit,
    errorMessage: String,
    totalPrice: Double,
    onBack: () -> Unit,
    onSubmit: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = "2. DADOS DO TITULAR & PARTICIPANTES",
            style = MaterialTheme.typography.titleMedium,
            color = TextPrimary
        )

        Spacer(modifier = Modifier.height(14.dp))

        if (errorMessage.isNotBlank()) {
            Text(
                text = "⚠️ $errorMessage",
                color = StatusRed,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier
                    .fillMaxWidth()
                    .background(StatusRedBg, RoundedCornerShape(10.dp))
                    .padding(10.dp)
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        OutlinedTextField(
            value = name,
            onValueChange = onNameChange,
            label = { Text("Nome Completo") },
            placeholder = { Text("ex: Bruno Rocker de Almeida") },
            modifier = Modifier.fillMaxWidth().testTag("input_titular_name"),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AmberPrimary,
                unfocusedBorderColor = BorderSubtle,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary
            )
        )

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedTextField(
            value = whatsapp,
            onValueChange = onWhatsappChange,
            label = { Text("WhatsApp com DDD") },
            placeholder = { Text("(11) 98765-4321") },
            modifier = Modifier.fillMaxWidth().testTag("input_titular_whatsapp"),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AmberPrimary,
                unfocusedBorderColor = BorderSubtle,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary
            )
        )

        Spacer(modifier = Modifier.height(10.dp))

        OutlinedTextField(
            value = cpf,
            onValueChange = onCpfChange,
            label = { Text("CPF") },
            placeholder = { Text("000.000.000-00") },
            modifier = Modifier.fillMaxWidth().testTag("input_titular_cpf"),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = AmberPrimary,
                unfocusedBorderColor = BorderSubtle,
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary
            )
        )

        // Companions fields
        if (companions.isNotEmpty()) {
            Spacer(modifier = Modifier.height(18.dp))
            Text(
                text = "Acompanhantes Adicionais (${companions.size})",
                style = MaterialTheme.typography.titleMedium,
                color = AmberPrimary
            )

            companions.forEachIndexed { index, companion ->
                Spacer(modifier = Modifier.height(10.dp))
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    backgroundColor = SurfaceElevated
                ) {
                    Text(
                        text = "Acompanhante #${index + 1}",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = companion.name,
                        onValueChange = { onCompanionChange(index, companion.copy(name = it)) },
                        label = { Text("Nome do Acompanhante") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = AmberPrimary,
                            unfocusedBorderColor = BorderSubtle
                        )
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = companion.cpf,
                        onValueChange = { onCompanionChange(index, companion.copy(cpf = it)) },
                        label = { Text("CPF do Acompanhante") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = AmberPrimary,
                            unfocusedBorderColor = BorderSubtle
                        )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            OutlinedButton(
                onClick = onBack,
                modifier = Modifier.weight(1f).height(50.dp),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("← Voltar", color = TextSecondary)
            }

            MaltButton(
                text = when (event.activeTicketMode) {
                    TicketMode.COMPLIMENTARY -> "Emitir Cortesia VIP"
                    TicketMode.PRE_REGISTRATION -> "Confirmar Fila VIP"
                    TicketMode.DIRECT_SALE -> "Ir para Pagamento"
                },
                onClick = onSubmit,
                modifier = Modifier.weight(2f)
            )
        }
    }
}

@Composable
private fun PaymentStep(
    event: HouseLandEvent,
    totalPrice: Double,
    name: String,
    onSimulatePayment: () -> Unit
) {
    val context = LocalContext.current
    val fakePixCode = "00020126580014br.gov.bcb.pix0136hl360-${System.currentTimeMillis()}5204000053039865802BR5920HOUSE LAND PRODUCOES6009SAO PAULO62070503***6304E8A2"

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "3. PAGAMENTO INSTANTÂNEO PIX",
            style = MaterialTheme.typography.titleMedium,
            color = TextPrimary
        )

        Spacer(modifier = Modifier.height(14.dp))

        GlassCard(
            modifier = Modifier.fillMaxWidth(),
            backgroundColor = SurfaceElevated
        ) {
            Text(
                text = "Total a Pagar",
                style = MaterialTheme.typography.labelSmall,
                color = TextMuted
            )
            Text(
                text = "R$ ${totalPrice.toInt()},00",
                style = MaterialTheme.typography.headlineLarge,
                color = AmberPrimary,
                fontWeight = FontWeight.Black
            )
            Text(
                text = "Beneficiário: House Land Produções Artísticas LTDA",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Copy Paste PIX Key
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(SurfaceDark, RoundedCornerShape(12.dp))
                .border(1.dp, BorderGlass, RoundedCornerShape(12.dp))
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = fakePixCode.take(28) + "...",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                fontFamily = FontFamily.Monospace,
                modifier = Modifier.weight(1f)
            )

            IconButton(
                onClick = {
                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("Código PIX", fakePixCode))
                    Toast.makeText(context, "Código PIX copiado!", Toast.LENGTH_SHORT).show()
                }
            ) {
                Icon(Icons.Default.ContentCopy, contentDescription = "Copiar Código PIX", tint = AmberPrimary)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        MaltButton(
            text = "⚡ Simular Pagamento Aprovado",
            onClick = onSimulatePayment,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun SuccessStep(
    event: HouseLandEvent,
    ticket: Ticket?,
    qrBitmap: Bitmap?,
    lead: Lead?,
    onFinish: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(60.dp)
                .background(Color(0x3310B981), CircleShape)
                .border(2.dp, Color(0xFF10B981), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Check,
                contentDescription = "Sucesso",
                tint = Color(0xFF10B981),
                modifier = Modifier.size(34.dp)
            )
        }

        Spacer(modifier = Modifier.height(14.dp))

        if (ticket != null) {
            Text(
                text = "INGRESSO CONFIRMADO COM SUCESSO!",
                style = MaterialTheme.typography.titleLarge,
                color = Color(0xFF10B981),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "Apresente o QR Code na portaria do evento",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )

            Spacer(modifier = Modifier.height(18.dp))

            // Ticket Card Visual
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = Color(0xFF0F1016),
                borderColor = AmberPrimary.copy(alpha = 0.5f)
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = ticket.eventName.uppercase(),
                        style = MaterialTheme.typography.titleMedium,
                        color = AmberPrimary,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        text = ticket.type,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    QrCodeBitmapImage(
                        bitmap = qrBitmap,
                        modifier = Modifier.size(200.dp)
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "CÓDIGO: ${ticket.id}",
                        style = MaterialTheme.typography.titleLarge,
                        fontFamily = FontFamily.Monospace,
                        color = TextPrimary
                    )

                    Text(
                        text = "Titular: ${ticket.name} • CPF: ${ticket.cpf}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        textAlign = TextAlign.Center
                    )
                }
            }
        } else if (lead != null) {
            Text(
                text = "PRÉ-CADASTRO REALIZADO!",
                style = MaterialTheme.typography.titleLarge,
                color = AmberPrimary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "Você está na lista prioritária VIP. Entraremos em contato via WhatsApp quando os lotes forem abertos.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(18.dp))

            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                backgroundColor = SurfaceElevated
            ) {
                Text(
                    text = "PROTOCOLO: ${lead.id}",
                    style = MaterialTheme.typography.titleMedium,
                    fontFamily = FontFamily.Monospace,
                    color = AmberPrimary
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Titular: ${lead.name}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextPrimary
                )
                Text(
                    text = "WhatsApp: ${lead.whatsapp}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
                Text(
                    text = "Quantidade Reservada: ${lead.ticketQuantity} ingresso(s)",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        MaltButton(
            text = "Concluir",
            onClick = onFinish,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
