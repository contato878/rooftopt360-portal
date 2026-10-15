package com.example.houseland.ui.components

import android.graphics.Bitmap
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.houseland.data.model.TicketMode
import com.example.houseland.data.model.TicketStatus
import com.example.houseland.ui.theme.*

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(18.dp),
    borderColor: Color = BorderGlass,
    backgroundColor: Color = SurfaceCard,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier
            .border(1.dp, borderColor, shape),
        shape = shape,
        colors = CardDefaults.cardColors(containerColor = backgroundColor)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            content = content
        )
    }
}

@Composable
fun MaltButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    leadingIcon: (@Composable () -> Unit)? = null
) {
    val gradientBrush = Brush.horizontalGradient(
        colors = if (enabled) listOf(Color(0xFFD97706), Color(0xFFF59E0B), Color(0xFFB45309))
        else listOf(Color(0xFF4B5563), Color(0xFF374151))
    )

    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .height(50.dp)
            .testTag("malt_button_$text"),
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            disabledContainerColor = Color.Transparent
        ),
        contentPadding = PaddingValues(0.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(gradientBrush)
                .padding(horizontal = 20.dp),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                if (leadingIcon != null) {
                    leadingIcon()
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = text.uppercase(),
                    color = if (enabled) Color.White else Color(0xFF9CA3AF),
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    letterSpacing = 0.8.sp
                )
            }
        }
    }
}

@Composable
fun MaltOutlinedButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    color: Color = AmberPrimary
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier
            .height(46.dp)
            .testTag("outlined_button_$text"),
        shape = RoundedCornerShape(12.dp),
        border = ButtonDefaults.outlinedButtonBorder.copy(
            brush = Brush.horizontalGradient(listOf(color.copy(alpha = 0.7f), color))
        ),
        colors = ButtonDefaults.outlinedButtonColors(
            containerColor = SurfaceDark.copy(alpha = 0.6f),
            contentColor = color
        )
    ) {
        Text(
            text = text,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            letterSpacing = 0.5.sp
        )
    }
}

@Composable
fun TicketModeBadgeView(mode: TicketMode) {
    val (bgColor, textColor, label) = when (mode) {
        TicketMode.COMPLIMENTARY -> Triple(Color(0x3310B981), Color(0xFF34D399), "Cortesia Grátis")
        TicketMode.PRE_REGISTRATION -> Triple(Color(0x333B82F6), Color(0xFF60A5FA), "Pré-cadastro VIP")
        TicketMode.DIRECT_SALE -> Triple(Color(0x33F59E0B), Color(0xFFFBBF24), "Venda Liberada")
    }

    Row(
        modifier = Modifier
            .background(bgColor, RoundedCornerShape(20.dp))
            .border(1.dp, textColor.copy(alpha = 0.3f), RoundedCornerShape(20.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .background(textColor, CircleShape)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = label.uppercase(),
            color = textColor,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace,
            letterSpacing = 0.5.sp
        )
    }
}

@Composable
fun StatusBadgeView(status: TicketStatus) {
    val (bgColor, textColor) = when (status) {
        TicketStatus.VALID -> Pair(StatusGreenBg, StatusGreen)
        TicketStatus.USED -> Pair(StatusYellowBg, StatusYellow)
        TicketStatus.CANCELLED -> Pair(StatusRedBg, StatusRed)
    }

    Row(
        modifier = Modifier
            .background(bgColor, RoundedCornerShape(20.dp))
            .border(1.dp, textColor.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(6.dp)
                .background(textColor, CircleShape)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = status.label.uppercase(),
            color = textColor,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FontFamily.Monospace
        )
    }
}

@Composable
fun QrCodeBitmapImage(
    bitmap: Bitmap?,
    modifier: Modifier = Modifier
) {
    if (bitmap != null) {
        Box(
            modifier = modifier
                .background(Color.White, RoundedCornerShape(12.dp))
                .border(2.dp, AmberPrimary.copy(alpha = 0.6f), RoundedCornerShape(12.dp))
                .padding(12.dp),
            contentAlignment = Alignment.Center
        ) {
            Image(
                bitmap = bitmap.asImageBitmap(),
                contentDescription = "Código QR do Ingresso",
                modifier = Modifier.fillMaxSize()
            )
        }
    } else {
        Box(
            modifier = modifier
                .background(SurfaceDark, RoundedCornerShape(12.dp))
                .border(1.dp, BorderGlass, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(
                color = AmberPrimary,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}

@Composable
fun SectionTagHeader(
    tag: String,
    title: String,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .background(AmberPrimary.copy(alpha = 0.12f), RoundedCornerShape(20.dp))
                .border(1.dp, AmberPrimary.copy(alpha = 0.35f), RoundedCornerShape(20.dp))
                .padding(horizontal = 10.dp, vertical = 3.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .background(AmberPrimary, CircleShape)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = tag.uppercase(),
                color = AmberPrimary,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FontFamily.Monospace,
                letterSpacing = 1.sp
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = title.uppercase(),
            style = MaterialTheme.typography.headlineMedium,
            color = TextPrimary,
            fontWeight = FontWeight.Black,
            letterSpacing = 0.5.sp
        )
    }
}
