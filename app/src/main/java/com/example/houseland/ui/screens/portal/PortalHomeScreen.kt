package com.example.houseland.ui.screens.portal

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.houseland.data.model.EventStatus
import com.example.houseland.data.model.HouseLandEvent
import com.example.houseland.data.repository.HouseLandRepository
import com.example.houseland.ui.components.GlassCard
import com.example.houseland.ui.components.MaltButton
import com.example.houseland.ui.components.SectionTagHeader
import com.example.houseland.ui.components.TicketModeBadgeView
import com.example.houseland.ui.screens.detail.rememberDrawableId
import com.example.houseland.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun PortalHomeScreen(
    onSelectEvent: (HouseLandEvent) -> Unit,
    onOpenScanner: () -> Unit,
    onOpenAdmin: () -> Unit
) {
    val context = LocalContext.current
    val events by HouseLandRepository.eventsFlow.collectAsState()
    val siteSettings by HouseLandRepository.siteSettingsFlow.collectAsState()

    val publishedEvents = events.filter { it.isPublished }
    val upcomingEvents = publishedEvents.filter { it.status == EventStatus.ACTIVE }
    val featuredEvent = upcomingEvents.firstOrNull() ?: publishedEvents.firstOrNull()

    // Countdown Timer State
    var timeLeftSeconds by remember { mutableLongStateOf(24 * 3600 * 25 + 3600 * 6 + 60 * 45) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(1000)
            if (timeLeftSeconds > 0) {
                timeLeftSeconds--
            }
        }
    }

    val days = timeLeftSeconds / 86400
    val hours = (timeLeftSeconds % 86400) / 3600
    val minutes = (timeLeftSeconds % 3600) / 60
    val seconds = timeLeftSeconds % 60

    Scaffold(
        containerColor = BackgroundDark,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceDark.copy(alpha = 0.95f))
                    .border(1.dp, BorderSubtle)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = siteSettings.brandName.uppercase(),
                        style = MaterialTheme.typography.titleLarge,
                        color = AmberPrimary,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = siteSettings.brandSubtitle,
                        style = MaterialTheme.typography.labelSmall,
                        color = TextSecondary
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(
                        onClick = onOpenScanner,
                        modifier = Modifier
                            .size(38.dp)
                            .background(SurfaceElevated, CircleShape)
                            .border(1.dp, BorderGlass, CircleShape)
                            .testTag("btn_open_scanner")
                    ) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = "Portaria QR",
                            tint = AmberPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    IconButton(
                        onClick = onOpenAdmin,
                        modifier = Modifier
                            .size(38.dp)
                            .background(SurfaceElevated, CircleShape)
                            .border(1.dp, BorderGlass, CircleShape)
                            .testTag("btn_open_admin")
                    ) {
                        Icon(
                            imageVector = Icons.Default.AdminPanelSettings,
                            contentDescription = "Painel Admin",
                            tint = TextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            verticalArrangement = Arrangement.spacedBy(22.dp)
        ) {
            // Hero Section
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(340.dp)
                ) {
                    val heroResId = rememberDrawableId(context, "hero_rock_chopp", "hero_rock_chopp")
                    Image(
                        painter = painterResource(id = heroResId),
                        contentDescription = "House Land Hero",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )

                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color(0x660A0A0D),
                                        Color(0xCC0A0A0D),
                                        BackgroundDark
                                    )
                                )
                            )
                    )

                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(18.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .background(AmberPrimary.copy(alpha = 0.15f), RoundedCornerShape(20.dp))
                                .border(1.dp, AmberPrimary.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                                .padding(horizontal = 10.dp, vertical = 3.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .background(AmberPrimary, CircleShape)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = siteSettings.heroBadgeText.uppercase(),
                                color = AmberPrimary,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                fontFamily = FontFamily.Monospace,
                                letterSpacing = 1.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Text(
                            text = siteSettings.heroTitle,
                            style = MaterialTheme.typography.headlineLarge,
                            color = TextPrimary,
                            fontWeight = FontWeight.Black,
                            lineHeight = 32.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = siteSettings.heroSubtitle,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            maxLines = 2
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        if (featuredEvent != null) {
                            MaltButton(
                                text = siteSettings.ctaButtonText,
                                onClick = { onSelectEvent(featuredEvent) },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }

            // Live Countdown Timer Card
            if (siteSettings.showCountdown) {
                item {
                    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                        GlassCard(
                            modifier = Modifier.fillMaxWidth(),
                            backgroundColor = SurfaceElevated,
                            borderColor = AmberPrimary.copy(alpha = 0.4f)
                        ) {
                            Text(
                                text = "⚡ CONTAGEM REGRESSIVA PARA O FESTIVAL",
                                style = MaterialTheme.typography.labelSmall,
                                color = AmberPrimary,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth()
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceEvenly,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                CountdownBox(value = "$days", label = "DIAS")
                                Text(":", color = AmberPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                                CountdownBox(value = String.format("%02d", hours), label = "HORAS")
                                Text(":", color = AmberPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                                CountdownBox(value = String.format("%02d", minutes), label = "MIN")
                                Text(":", color = AmberPrimary, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                                CountdownBox(value = String.format("%02d", seconds), label = "SEG")
                            }
                        }
                    }
                }
            }

            // Agenda Section Title
            item {
                SectionTagHeader(
                    tag = "Programação Oficial",
                    title = siteSettings.agendaSectionTitle,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }

            // Agenda Events List
            items(publishedEvents) { event ->
                EventCardView(
                    event = event,
                    onSelect = { onSelectEvent(event) },
                    modifier = Modifier.padding(horizontal = 16.dp)
                )
            }

            // About / Manifesto Section
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    GlassCard(
                        modifier = Modifier.fillMaxWidth(),
                        backgroundColor = SurfaceElevated
                    ) {
                        Text(
                            text = siteSettings.aboutBadge.uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = AmberPrimary
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = siteSettings.aboutTitle,
                            style = MaterialTheme.typography.titleLarge,
                            color = TextPrimary
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = siteSettings.aboutText,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary,
                            lineHeight = 20.sp
                        )

                        Spacer(modifier = Modifier.height(16.dp))

                        // Stats metrics
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            siteSettings.stats.forEach { stat ->
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .background(SurfaceDark, RoundedCornerShape(10.dp))
                                        .border(1.dp, BorderSubtle, RoundedCornerShape(10.dp))
                                        .padding(10.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = stat.value,
                                        style = MaterialTheme.typography.headlineSmall,
                                        color = AmberPrimary,
                                        fontWeight = FontWeight.Black
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = stat.label,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = TextSecondary,
                                        textAlign = TextAlign.Center,
                                        fontSize = 10.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Partnerships & WhatsApp CTA
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    GlassCard(
                        modifier = Modifier.fillMaxWidth(),
                        backgroundColor = Color(0xFF13141B),
                        borderColor = AmberPrimary.copy(alpha = 0.3f)
                    ) {
                        Text(
                            text = "PARCERIAS & BANDAS",
                            style = MaterialTheme.typography.labelSmall,
                            color = AmberPrimary
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = siteSettings.partnershipTitle,
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        Text(
                            text = siteSettings.partnershipDescription,
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextSecondary
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        MaltButton(
                            text = "Falar com a Produção no WhatsApp",
                            onClick = {
                                val cleanPhone = siteSettings.ctaPartnershipWhatsapp.replace(Regex("\\D"), "")
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$cleanPhone"))
                                context.startActivity(intent)
                            },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            // Footer
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark)
                        .border(1.dp, BorderSubtle)
                        .padding(20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = siteSettings.footerBrandTitle,
                        style = MaterialTheme.typography.titleLarge,
                        color = AmberPrimary,
                        fontWeight = FontWeight.Black
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = siteSettings.footerBrandDescription,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Text(
                        text = siteSettings.footerDisclaimer,
                        style = MaterialTheme.typography.labelSmall,
                        color = TextMuted,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "CNPJ: ${siteSettings.footerCnpj}",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextMuted,
                        fontFamily = FontFamily.Monospace
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    OutlinedButton(
                        onClick = onOpenAdmin,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.testTag("btn_footer_admin")
                    ) {
                        Icon(Icons.Default.AdminPanelSettings, contentDescription = null, tint = AmberPrimary, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Acesso Painel Administrativo", color = AmberPrimary, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}

@Composable
private fun CountdownBox(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(width = 54.dp, height = 48.dp)
                .background(SurfaceDark, RoundedCornerShape(10.dp))
                .border(1.dp, BorderGlass, RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                color = AmberPrimary,
                fontWeight = FontWeight.Black
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = TextSecondary,
            fontSize = 9.sp
        )
    }
}

@Composable
private fun EventCardView(
    event: HouseLandEvent,
    onSelect: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val imageResId = rememberDrawableId(context, event.bannerImageResName, "hero_rock_chopp")

    GlassCard(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onSelect),
        backgroundColor = SurfaceDark
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(140.dp)
                .clip(RoundedCornerShape(12.dp))
        ) {
            Image(
                painter = painterResource(id = imageResId),
                contentDescription = event.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color(0xCC0A0A0D))
                        )
                    )
            )

            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(10.dp)
            ) {
                TicketModeBadgeView(mode = event.activeTicketMode)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Text(
            text = event.editionBadge.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = AmberPrimary
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = event.title,
            style = MaterialTheme.typography.titleLarge,
            color = TextPrimary
        )

        Spacer(modifier = Modifier.height(6.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = AmberPrimary, modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = event.date,
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )
        }

        Spacer(modifier = Modifier.height(2.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.LocationOn, contentDescription = null, tint = AmberPrimary, modifier = Modifier.size(14.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "${event.location} • Abertura: ${event.doorsOpen}",
                style = MaterialTheme.typography.bodyMedium,
                color = TextMuted
            )
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = when (event.activeTicketMode) {
                    com.example.houseland.data.model.TicketMode.COMPLIMENTARY -> "Cortesia Disponível"
                    com.example.houseland.data.model.TicketMode.PRE_REGISTRATION -> "Fila de Espera"
                    com.example.houseland.data.model.TicketMode.DIRECT_SALE -> "A partir de R$ ${event.ticketPrices.pista.toInt()},00"
                },
                style = MaterialTheme.typography.labelSmall,
                color = AmberPrimary,
                fontWeight = FontWeight.Bold
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "VER DETALHES",
                    color = AmberPrimary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.width(4.dp))
                Icon(
                    Icons.Default.ArrowForward,
                    contentDescription = null,
                    tint = AmberPrimary,
                    modifier = Modifier.size(14.dp)
                )
            }
        }
    }
}
