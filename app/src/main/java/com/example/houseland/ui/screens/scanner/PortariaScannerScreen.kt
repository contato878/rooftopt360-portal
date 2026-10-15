package com.example.houseland.ui.screens.scanner

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Warning
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
import com.example.houseland.data.model.CheckInResult
import com.example.houseland.data.model.CheckInStatus
import com.example.houseland.data.model.Ticket
import com.example.houseland.data.repository.HouseLandRepository
import com.example.houseland.ui.components.GlassCard
import com.example.houseland.ui.components.MaltButton
import com.example.houseland.ui.components.StatusBadgeView
import com.example.houseland.ui.theme.*

@Composable
fun PortariaScannerScreen(
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    var inputCode by remember { mutableStateOf("") }
    var lastResult by remember { mutableStateOf<CheckInResult?>(null) }
    val allTickets by HouseLandRepository.ticketsFlow.collectAsState()

    fun triggerHapticFeedback(success: Boolean) {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }

            if (vibrator != null && vibrator.hasVibrator()) {
                if (success) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE))
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator.vibrate(100)
                    }
                } else {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 150, 100, 150), -1))
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator.vibrate(longArrayOf(0, 150, 100, 150), -1)
                    }
                }
            }
        } catch (_: Exception) {}
    }

    fun handleCheckIn(code: String) {
        if (code.isBlank()) return
        val result = HouseLandRepository.validateCheckIn(code, "Portaria Mobile - AI Studio")
        lastResult = result
        triggerHapticFeedback(result.status == CheckInStatus.SUCCESS)
        inputCode = ""
    }

    Scaffold(
        containerColor = BackgroundDark,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceDark)
                    .border(1.dp, BorderSubtle)
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onNavigateBack,
                    modifier = Modifier.testTag("btn_back_scanner")
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Voltar",
                        tint = AmberPrimary
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                Column {
                    Text(
                        text = "PORTARIA & VALIDAÇÃO QR",
                        style = MaterialTheme.typography.titleMedium,
                        color = AmberPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Controle de Acesso em Tempo Real",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(6.dp))

                // Scanner Input Area
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    backgroundColor = SurfaceElevated
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .background(AmberPrimary.copy(alpha = 0.15f), CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.QrCodeScanner,
                                contentDescription = "Scanner",
                                tint = AmberPrimary
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "LEITURA DE INGRESSO",
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary
                            )
                            Text(
                                text = "Digite o ID ou escaneie o payload QR Code",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedTextField(
                        value = inputCode,
                        onValueChange = { inputCode = it },
                        label = { Text("Código do Ingresso (ex: HL360-R-1092)") },
                        modifier = Modifier.fillMaxWidth().testTag("input_ticket_code"),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = AmberPrimary,
                            unfocusedBorderColor = BorderSubtle,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        ),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    MaltButton(
                        text = "Validar Entrada",
                        onClick = { handleCheckIn(inputCode) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = inputCode.isNotBlank()
                    )
                }
            }

            // Result Feedback Card
            item {
                if (lastResult != null) {
                    val res = lastResult!!
                    val (cardBg, borderColor, icon, statusTitle) = when (res.status) {
                        CheckInStatus.SUCCESS -> Quadruple(
                            Color(0x2210B981),
                            Color(0xFF10B981),
                            Icons.Default.CheckCircle,
                            "ENTRADA LIBERADA!"
                        )
                        CheckInStatus.ALREADY_USED -> Quadruple(
                            Color(0x22F59E0B),
                            Color(0xFFF59E0B),
                            Icons.Default.Warning,
                            "INGRESSO JÁ UTILIZADO!"
                        )
                        CheckInStatus.INVALID -> Quadruple(
                            Color(0x22EF4444),
                            Color(0xFFEF4444),
                            Icons.Default.Error,
                            "INGRESSO INVÁLIDO!"
                        )
                    }

                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(2.dp, borderColor, RoundedCornerShape(16.dp)),
                        colors = CardDefaults.cardColors(containerColor = cardBg),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = icon,
                                    contentDescription = statusTitle,
                                    tint = borderColor,
                                    modifier = Modifier.size(32.dp)
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = statusTitle,
                                    style = MaterialTheme.typography.titleLarge,
                                    color = borderColor,
                                    fontWeight = FontWeight.Black
                                )
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            Text(
                                text = res.message,
                                style = MaterialTheme.typography.bodyLarge,
                                color = TextPrimary
                            )

                            if (res.ticket != null) {
                                Spacer(modifier = Modifier.height(12.dp))
                                HorizontalDivider(color = borderColor.copy(alpha = 0.3f))
                                Spacer(modifier = Modifier.height(12.dp))

                                Text(
                                    text = "Titular: ${res.ticket.name} (${res.ticket.cpf})",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextSecondary
                                )
                                Text(
                                    text = "Tipo: ${res.ticket.type} • Lote: ${res.ticket.batch}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextSecondary
                                )
                                Text(
                                    text = "Horário de Checagem: ${res.timestamp}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = TextMuted
                                )
                            }
                        }
                    }
                }
            }

            // Quick Test Buttons (Click to test validation)
            item {
                Text(
                    text = "TESTE RÁPIDO DE PORTARIA (INGRESSOS SEED)",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextMuted
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = { handleCheckIn("HL360-R-1092") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Testar Válido\n(Camila)", fontSize = 11.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center, color = AmberPrimary)
                    }

                    OutlinedButton(
                        onClick = { handleCheckIn("HL360-R-3401") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Testar Usado\n(Gustavo)", fontSize = 11.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center, color = TextSecondary)
                    }

                    OutlinedButton(
                        onClick = { handleCheckIn("HL-INVALID-999") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Testar Falso\n(Inválido)", fontSize = 11.sp, textAlign = androidx.compose.ui.text.style.TextAlign.Center, color = StatusRed)
                    }
                }
            }

            // List of Tickets in System
            item {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    text = "HISTÓRICO DA BASE DE INGRESSOS (${allTickets.size})",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )
            }

            items(allTickets) { ticket ->
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    backgroundColor = SurfaceDark
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = ticket.name,
                                style = MaterialTheme.typography.titleMedium,
                                color = TextPrimary
                            )
                            Text(
                                text = "ID: ${ticket.id} • ${ticket.type}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary,
                                fontFamily = FontFamily.Monospace
                            )
                            if (ticket.usedAt != null) {
                                Text(
                                    text = "Utilizado em: ${ticket.usedAt} (${ticket.checkedInBy})",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = AmberPrimary
                                )
                            }
                        }

                        StatusBadgeView(status = ticket.status)
                    }
                }
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

private data class Quadruple<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
