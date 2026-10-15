package com.example.houseland

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.example.houseland.data.model.HouseLandEvent
import com.example.houseland.data.repository.HouseLandRepository
import com.example.houseland.ui.screens.admin.AdminDashboardScreen
import com.example.houseland.ui.screens.detail.EventDetailScreen
import com.example.houseland.ui.screens.portal.PortalHomeScreen
import com.example.houseland.ui.screens.scanner.PortariaScannerScreen
import com.example.houseland.ui.screens.ticket.TicketModalDialog
import com.example.houseland.ui.theme.BackgroundDark
import com.example.houseland.ui.theme.HouseLandTheme

sealed class Screen {
    data object Portal : Screen()
    data class EventDetail(val event: HouseLandEvent) : Screen()
    data object Scanner : Screen()
    data object Admin : Screen()
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            HouseLandTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = BackgroundDark
                ) {
                    var currentScreen by remember { mutableStateOf<Screen>(Screen.Portal) }
                    var ticketModalEvent by remember { mutableStateOf<HouseLandEvent?>(null) }

                    // BackHandler for sub-screens
                    BackHandler(enabled = currentScreen !is Screen.Portal) {
                        currentScreen = Screen.Portal
                    }

                    when (val screen = currentScreen) {
                        is Screen.Portal -> {
                            PortalHomeScreen(
                                onSelectEvent = { selectedEvent ->
                                    currentScreen = Screen.EventDetail(selectedEvent)
                                },
                                onOpenScanner = {
                                    currentScreen = Screen.Scanner
                                },
                                onOpenAdmin = {
                                    currentScreen = Screen.Admin
                                }
                            )
                        }
                        is Screen.EventDetail -> {
                            EventDetailScreen(
                                event = screen.event,
                                onBack = { currentScreen = Screen.Portal },
                                onOpenTicketFlow = {
                                    ticketModalEvent = screen.event
                                }
                            )
                        }
                        is Screen.Scanner -> {
                            PortariaScannerScreen(
                                onNavigateBack = { currentScreen = Screen.Portal }
                            )
                        }
                        is Screen.Admin -> {
                            AdminDashboardScreen(
                                onExitToPortal = { currentScreen = Screen.Portal }
                            )
                        }
                    }

                    // Ticket Modal Overlay
                    if (ticketModalEvent != null) {
                        TicketModalDialog(
                            event = ticketModalEvent!!,
                            onDismiss = { ticketModalEvent = null }
                        )
                    }
                }
            }
        }
    }
}
