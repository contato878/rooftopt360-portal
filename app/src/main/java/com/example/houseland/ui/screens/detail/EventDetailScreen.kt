package com.example.houseland.ui.screens.detail

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ConfirmationNumber
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.houseland.data.model.Band
import com.example.houseland.data.model.BbqItem
import com.example.houseland.data.model.BeerTap
import com.example.houseland.data.model.HouseLandEvent
import com.example.houseland.data.model.TicketMode
import com.example.houseland.ui.components.GlassCard
import com.example.houseland.ui.components.MaltButton
import com.example.houseland.ui.components.SectionTagHeader
import com.example.houseland.ui.components.TicketModeBadgeView
import com.example.houseland.ui.theme.*

@Composable
fun EventDetailScreen(
    event: HouseLandEvent,
    onBack: () -> Unit,
    onOpenTicketFlow: () -> Unit
) {
    val context = LocalContext.current

    // Helper for drawable resource
    val bannerResId = rememberDrawableId(context, event.bannerImageResName, "hero_rock_chopp")

    Scaffold(
        containerColor = BackgroundDark,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(SurfaceDark.copy(alpha = 0.95f))
                    .border(1.dp, BorderSubtle)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                OutlinedButton(
                    onClick = onBack,
                    modifier = Modifier.height(40.dp).testTag("btn_back_agenda"),
                    shape = RoundedCornerShape(10.dp),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = Brush.horizontalGradient(listOf(AmberPrimary.copy(alpha = 0.4f), AmberPrimary))
                    )
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Voltar",
                        tint = AmberPrimary,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "AGENDA",
                        color = AmberPrimary,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }

                MaltButton(
                    text = when (event.activeTicketMode) {
                        TicketMode.COMPLIMENTARY -> "Cortesia Grátis"
                        TicketMode.PRE_REGISTRATION -> "Lista VIP"
                        TicketMode.DIRECT_SALE -> "Comprar"
                    },
                    onClick = onOpenTicketFlow,
                    modifier = Modifier.height(40.dp)
                )
            }
        },
        bottomBar = {
            Surface(
                color = SurfaceDark,
                border = androidx.compose.foundation.BorderStroke(1.dp, BorderGlass),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = event.title.take(24) + "...",
                            style = MaterialTheme.typography.titleMedium,
                            color = TextPrimary
                        )
                        Text(
                            text = when (event.activeTicketMode) {
                                TicketMode.COMPLIMENTARY -> "Resgate Grátis Disponível"
                                TicketMode.PRE_REGISTRATION -> "Fila de Espera VIP Ativa"
                                TicketMode.DIRECT_SALE -> "A partir de R$ ${event.ticketPrices.pista.toInt()},00"
                            },
                            style = MaterialTheme.typography.labelSmall,
                            color = AmberPrimary
                        )
                    }

                    MaltButton(
                        text = when (event.activeTicketMode) {
                            TicketMode.COMPLIMENTARY -> "Resgatar VIP"
                            TicketMode.PRE_REGISTRATION -> "Entrar na Lista"
                            TicketMode.DIRECT_SALE -> "Garantir Ingresso"
                        },
                        onClick = onOpenTicketFlow,
                        modifier = Modifier.width(160.dp)
                    )
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            // Hero Section
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(300.dp)
                ) {
                    Image(
                        painter = painterResource(id = bannerResId),
                        contentDescription = event.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )

                    // Gradients
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        Color(0x990A0A0D),
                                        BackgroundDark
                                    )
                                )
                            )
                    )

                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(16.dp)
                    ) {
                        TicketModeBadgeView(mode = event.activeTicketMode)

                        Spacer(modifier = Modifier.height(8.dp))

                        Text(
                            text = event.title,
                            style = MaterialTheme.typography.headlineLarge,
                            color = TextPrimary,
                            fontWeight = FontWeight.Black
                        )

                        Spacer(modifier = Modifier.height(6.dp))

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Schedule, contentDescription = null, tint = AmberPrimary, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "${event.date} • Abertura: ${event.doorsOpen}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary
                            )
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, tint = AmberPrimary, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "${event.location} - ${event.address}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextSecondary
                            )
                        }
                    }
                }
            }

            // Highlights Row
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        event.highlights.take(3).forEach { hl ->
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .background(SurfaceElevated, RoundedCornerShape(10.dp))
                                    .border(1.dp, BorderGlass, RoundedCornerShape(10.dp))
                                    .padding(vertical = 8.dp, horizontal = 4.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = hl,
                                    color = TextPrimary,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                            }
                        }
                    }
                }
            }

            // Full Description
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = "EXPERIÊNCIA DA EDIÇÃO",
                            style = MaterialTheme.typography.labelSmall,
                            color = AmberPrimary
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = event.fullDescription,
                            style = MaterialTheme.typography.bodyLarge,
                            color = TextPrimary,
                            lineHeight = 22.sp
                        )
                    }
                }
            }

            // Lineup Section
            if (event.bands.isNotEmpty()) {
                item {
                    SectionTagHeader(
                        tag = "Line-up Oficial",
                        title = "Bandas & Horários",
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }

                items(event.bands) { band ->
                    BandCardView(band = band, modifier = Modifier.padding(horizontal = 16.dp))
                }
            }

            // Craft Beer Taps Section
            if (event.beerTaps.isNotEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    SectionTagHeader(
                        tag = "Chopp Puro Malte",
                        title = "Torneiras Artesanais",
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }

                items(event.beerTaps) { tap ->
                    BeerTapCardView(tap = tap, modifier = Modifier.padding(horizontal = 16.dp))
                }
            }

            // Smoked BBQ Menu Section
            if (event.bbqMenu.isNotEmpty()) {
                item {
                    Spacer(modifier = Modifier.height(8.dp))
                    SectionTagHeader(
                        tag = "Pitmaster BBQ",
                        title = "Gastronomia na Brasa",
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }

                items(event.bbqMenu) { bbq ->
                    BbqCardView(bbq = bbq, modifier = Modifier.padding(horizontal = 16.dp))
                }
            }

            item {
                Spacer(modifier = Modifier.height(40.dp))
            }
        }
    }
}

@Composable
private fun BandCardView(band: Band, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val imageResId = rememberDrawableId(context, band.imageResName, "band_vintage_overdrive")

    GlassCard(modifier = modifier.fillMaxWidth(), backgroundColor = SurfaceDark) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Image(
                painter = painterResource(id = imageResId),
                contentDescription = band.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(90.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.dp, BorderGlass, RoundedCornerShape(12.dp))
            )

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = band.name,
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary
                    )
                }

                Text(
                    text = "${band.genre} • ${band.timeSlot}",
                    style = MaterialTheme.typography.labelSmall,
                    color = AmberPrimary
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = band.description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextSecondary,
                    maxLines = 2
                )

                if (band.highlightSong.isNotBlank()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "⚡ Highlight: ${band.highlightSong}",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
private fun BeerTapCardView(tap: BeerTap, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth(), backgroundColor = SurfaceDark) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = tap.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = TextPrimary
                )
                if (tap.style.isNotBlank()) {
                    Text(
                        text = tap.style,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextSecondary
                    )
                }
                if (tap.notes.isNotBlank()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = tap.notes,
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextMuted
                    )
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(horizontalAlignment = Alignment.End) {
                Box(
                    modifier = Modifier
                        .background(AmberPrimary.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(text = tap.abv, color = AmberPrimary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Box(
                    modifier = Modifier
                        .background(SurfaceElevated, RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 2.dp)
                ) {
                    Text(text = tap.ibu, color = TextSecondary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                }
            }
        }
    }
}

@Composable
private fun BbqCardView(bbq: BbqItem, modifier: Modifier = Modifier) {
    GlassCard(modifier = modifier.fillMaxWidth(), backgroundColor = SurfaceDark) {
        Text(
            text = bbq.name,
            style = MaterialTheme.typography.titleMedium,
            color = TextPrimary
        )
        Text(
            text = "Corte: ${bbq.cut}",
            style = MaterialTheme.typography.labelSmall,
            color = AmberPrimary
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = bbq.description,
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
        if (bbq.servedWith.isNotBlank()) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Acompanha: ${bbq.servedWith}",
                style = MaterialTheme.typography.labelSmall,
                color = TextMuted
            )
        }
    }
}

@Composable
fun rememberDrawableId(context: android.content.Context, name: String, fallback: String): Int {
    val cleanName = name.replace(".jpg", "").replace(".png", "").substringAfterLast("/")
    val resId = context.resources.getIdentifier(cleanName, "drawable", context.packageName)
    return if (resId != 0) resId else {
        context.resources.getIdentifier(fallback, "drawable", context.packageName)
    }
}
