package app.lovable.ee3834849f11481bad7f08d619b104bd

import android.app.Activity
import android.content.Intent
import android.util.Log
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.gms.auth.api.identity.BeginSignInRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.SignInClient
import com.google.android.gms.common.api.ApiException

/**
 * Capacitor plugin for native Google Sign-In using Google Identity Services (One Tap).
 * 
 * This plugin uses the modern Google Identity Services SDK to perform Google Sign-In
 * entirely within the app, without opening a browser or Chrome Custom Tab.
 * 
 * The plugin returns a Google ID Token which can be used with Supabase's signInWithIdToken.
 */
@CapacitorPlugin(name = "GoogleSignIn")
class GoogleSignInPlugin : Plugin() {
    
    companion object {
        private const val TAG = "GoogleSignInPlugin"
    }
    
    private lateinit var oneTapClient: SignInClient
    private var pendingCall: PluginCall? = null
    private var signInLauncher: ActivityResultLauncher<IntentSenderRequest>? = null
    
    override fun load() {
        super.load()
        Log.d(TAG, "GoogleSignInPlugin loaded")
        
        oneTapClient = Identity.getSignInClient(context)
        
        // Register for activity result using the modern ActivityResult API
        signInLauncher = activity.registerForActivityResult(
            ActivityResultContracts.StartIntentSenderForResult()
        ) { result ->
            handleSignInResult(result.resultCode, result.data)
        }
    }
    
    /**
     * Initiates native Google Sign-In using One Tap.
     * Returns the Google ID Token on success.
     */
    @PluginMethod
    fun signIn(call: PluginCall) {
        Log.d(TAG, "signIn called")
        
        // Get the Web Client ID from the call (passed from JavaScript)
        val webClientId = call.getString("webClientId")
        if (webClientId.isNullOrEmpty()) {
            call.reject("webClientId is required")
            return
        }
        
        pendingCall = call
        
        // Build the sign-in request
        val signInRequest = BeginSignInRequest.builder()
            .setGoogleIdTokenRequestOptions(
                BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                    .setSupported(true)
                    .setServerClientId(webClientId)
                    // Show all accounts, not just those previously used
                    .setFilterByAuthorizedAccounts(false)
                    .build()
            )
            // Auto-select if only one account is available
            .setAutoSelectEnabled(true)
            .build()
        
        Log.d(TAG, "Starting One Tap sign-in with webClientId: ${webClientId.take(20)}...")
        
        oneTapClient.beginSignIn(signInRequest)
            .addOnSuccessListener(activity) { result ->
                Log.d(TAG, "beginSignIn succeeded, launching intent")
                try {
                    val intentSenderRequest = IntentSenderRequest.Builder(result.pendingIntent.intentSender).build()
                    signInLauncher?.launch(intentSenderRequest)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to launch sign-in intent", e)
                    pendingCall?.reject("Failed to start sign-in: ${e.message}")
                    pendingCall = null
                }
            }
            .addOnFailureListener(activity) { e ->
                Log.e(TAG, "beginSignIn failed", e)
                // One Tap failed - this can happen if no Google accounts are on device
                // or if the user has disabled One Tap
                pendingCall?.reject("Google Sign-In failed: ${e.message}")
                pendingCall = null
            }
    }
    
    /**
     * Signs out the current user from Google (clears One Tap state).
     */
    @PluginMethod
    fun signOut(call: PluginCall) {
        Log.d(TAG, "signOut called")
        
        oneTapClient.signOut()
            .addOnSuccessListener {
                Log.d(TAG, "signOut succeeded")
                call.resolve()
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "signOut failed", e)
                // Resolve anyway - signing out from Supabase is what matters
                call.resolve()
            }
    }
    
    /**
     * Handles the result from the One Tap sign-in intent.
     */
    private fun handleSignInResult(resultCode: Int, data: Intent?) {
        Log.d(TAG, "handleSignInResult: resultCode=$resultCode")
        
        val call = pendingCall
        if (call == null) {
            Log.w(TAG, "No pending call for sign-in result")
            return
        }
        pendingCall = null
        
        when (resultCode) {
            Activity.RESULT_OK -> {
                try {
                    val credential = oneTapClient.getSignInCredentialFromIntent(data)
                    val idToken = credential.googleIdToken
                    
                    if (idToken != null) {
                        Log.d(TAG, "Got ID token successfully")
                        
                        val result = JSObject()
                        result.put("idToken", idToken)
                        result.put("email", credential.id)
                        result.put("displayName", credential.displayName ?: "")
                        result.put("profilePictureUri", credential.profilePictureUri?.toString() ?: "")
                        
                        call.resolve(result)
                    } else {
                        Log.e(TAG, "No ID token in credential")
                        call.reject("No ID token received from Google")
                    }
                } catch (e: ApiException) {
                    Log.e(TAG, "Failed to get credential from intent", e)
                    call.reject("Failed to get Google credential: ${e.message}")
                }
            }
            Activity.RESULT_CANCELED -> {
                Log.d(TAG, "User cancelled sign-in")
                call.reject("Sign-in cancelled by user")
            }
            else -> {
                Log.e(TAG, "Unknown result code: $resultCode")
                call.reject("Sign-in failed with unknown error")
            }
        }
    }
}
