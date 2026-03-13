package app.lovable.ee3834849f11481bad7f08d619b104bd

import android.util.Log
import com.android.billingclient.api.*
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Capacitor plugin for Google Play Billing Library.
 * Handles consumable in-app purchases for the "Light a Candle" feature.
 *
 * Flow: purchase → acknowledge → (after 24h) consume
 */
@CapacitorPlugin(name = "PlayBilling")
class BillingPlugin : Plugin(), PurchasesUpdatedListener {

    companion object {
        private const val TAG = "BillingPlugin"
    }

    private lateinit var billingClient: BillingClient
    private var pendingPurchaseCall: PluginCall? = null

    override fun load() {
        super.load()
        Log.d(TAG, "BillingPlugin loaded")

        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases()
            .build()
    }

    @PluginMethod
    fun connect(call: PluginCall) {
        Log.d(TAG, "connect called")
        if (billingClient.isReady) {
            call.resolve(JSObject().put("connected", true))
            return
        }

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(billingResult: BillingResult) {
                if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                    Log.d(TAG, "Billing client connected")
                    call.resolve(JSObject().put("connected", true))
                } else {
                    Log.e(TAG, "Billing setup failed: ${billingResult.debugMessage}")
                    call.reject("Billing setup failed: ${billingResult.debugMessage}")
                }
            }

            override fun onBillingServiceDisconnected() {
                Log.w(TAG, "Billing service disconnected")
            }
        })
    }

    @PluginMethod
    fun getProductDetails(call: PluginCall) {
        val productId = call.getString("productId") ?: run {
            call.reject("productId is required")
            return
        }

        Log.d(TAG, "getProductDetails: $productId")

        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        )

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && productDetailsList.isNotEmpty()) {
                val details = productDetailsList[0]
                val result = JSObject()
                result.put("productId", details.productId)
                result.put("title", details.title)
                result.put("description", details.description)
                result.put("price", details.oneTimePurchaseOfferDetails?.formattedPrice ?: "")
                result.put("priceMicros", details.oneTimePurchaseOfferDetails?.priceAmountMicros ?: 0)
                result.put("currencyCode", details.oneTimePurchaseOfferDetails?.priceCurrencyCode ?: "")
                call.resolve(result)
            } else {
                Log.e(TAG, "Failed to get product details: ${billingResult.debugMessage}")
                call.reject("Product not found or billing error: ${billingResult.debugMessage}")
            }
        }
    }

    @PluginMethod
    fun purchase(call: PluginCall) {
        val productId = call.getString("productId") ?: run {
            call.reject("productId is required")
            return
        }

        Log.d(TAG, "purchase: $productId")
        pendingPurchaseCall = call

        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        )

        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()

        billingClient.queryProductDetailsAsync(params) { billingResult, productDetailsList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && productDetailsList.isNotEmpty()) {
                val productDetails = productDetailsList[0]

                val flowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(
                        listOf(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(productDetails)
                                .build()
                        )
                    )
                    .build()

                activity.runOnUiThread {
                    val launchResult = billingClient.launchBillingFlow(activity, flowParams)
                    if (launchResult.responseCode != BillingClient.BillingResponseCode.OK) {
                        Log.e(TAG, "Failed to launch billing flow: ${launchResult.debugMessage}")
                        pendingPurchaseCall?.reject("Failed to start purchase: ${launchResult.debugMessage}")
                        pendingPurchaseCall = null
                    }
                }
            } else {
                Log.e(TAG, "Product not found for purchase: ${billingResult.debugMessage}")
                pendingPurchaseCall?.reject("Product not found: ${billingResult.debugMessage}")
                pendingPurchaseCall = null
            }
        }
    }

    /**
     * Acknowledge a purchase (required within 3 days or Google refunds it).
     * Does NOT consume — item remains owned until consumed.
     */
    @PluginMethod
    fun acknowledgePurchase(call: PluginCall) {
        val purchaseToken = call.getString("purchaseToken") ?: run {
            call.reject("purchaseToken is required")
            return
        }

        Log.d(TAG, "acknowledgePurchase")

        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchaseToken)
            .build()

        billingClient.acknowledgePurchase(params) { billingResult ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "Purchase acknowledged successfully")
                call.resolve(JSObject().put("acknowledged", true))
            } else {
                Log.e(TAG, "Failed to acknowledge purchase: ${billingResult.debugMessage}")
                call.reject("Failed to acknowledge purchase: ${billingResult.debugMessage}")
            }
        }
    }

    /**
     * Consume a purchase (mark it as consumed so it can be purchased again).
     * Should only be called after the candle has expired (24h).
     */
    @PluginMethod
    fun consumePurchase(call: PluginCall) {
        val purchaseToken = call.getString("purchaseToken") ?: run {
            call.reject("purchaseToken is required")
            return
        }

        Log.d(TAG, "consumePurchase")

        val consumeParams = ConsumeParams.newBuilder()
            .setPurchaseToken(purchaseToken)
            .build()

        billingClient.consumeAsync(consumeParams) { billingResult, outToken ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                Log.d(TAG, "Purchase consumed successfully")
                call.resolve(JSObject().put("consumed", true))
            } else {
                Log.e(TAG, "Failed to consume purchase: ${billingResult.debugMessage}")
                call.reject("Failed to consume purchase: ${billingResult.debugMessage}")
            }
        }
    }

    /**
     * Query all owned (purchased but not consumed) items.
     */
    @PluginMethod
    fun getOwnedPurchases(call: PluginCall) {
        Log.d(TAG, "getOwnedPurchases")

        billingClient.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        ) { billingResult, purchaseList ->
            if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
                val result = JSObject()
                val purchases = purchaseList
                    .filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
                    .map { purchase ->
                        JSObject().apply {
                            put("purchaseToken", purchase.purchaseToken)
                            put("orderId", purchase.orderId ?: "")
                            put("productId", purchase.products.firstOrNull() ?: "")
                            put("purchaseTime", purchase.purchaseTime)
                            put("isAcknowledged", purchase.isAcknowledged)
                        }
                    }
                result.put("purchases", purchases)
                call.resolve(result)
            } else {
                call.reject("Failed to query purchases: ${billingResult.debugMessage}")
            }
        }
    }

    override fun onPurchasesUpdated(billingResult: BillingResult, purchases: MutableList<Purchase>?) {
        val call = pendingPurchaseCall
        pendingPurchaseCall = null

        when (billingResult.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                if (purchases != null && purchases.isNotEmpty()) {
                    val purchase = purchases[0]
                    when (purchase.purchaseState) {
                        Purchase.PurchaseState.PURCHASED -> {
                            Log.d(TAG, "Purchase successful")
                            val result = JSObject()
                            result.put("purchaseToken", purchase.purchaseToken)
                            result.put("orderId", purchase.orderId ?: "")
                            result.put("productId", purchase.products.firstOrNull() ?: "")
                            result.put("purchaseTime", purchase.purchaseTime)
                            result.put("state", "PURCHASED")
                            result.put("isAcknowledged", purchase.isAcknowledged)
                            call?.resolve(result)
                        }
                        Purchase.PurchaseState.PENDING -> {
                            Log.d(TAG, "Purchase pending")
                            val result = JSObject()
                            result.put("state", "PENDING")
                            result.put("purchaseToken", purchase.purchaseToken)
                            call?.resolve(result)
                        }
                        else -> {
                            call?.reject("Purchase in unknown state: ${purchase.purchaseState}")
                        }
                    }
                } else {
                    call?.reject("No purchases returned")
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED -> {
                Log.d(TAG, "Purchase cancelled by user")
                call?.reject("Purchase cancelled by user", "USER_CANCELED")
            }
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> {
                Log.w(TAG, "Item already owned — returning ITEM_ALREADY_OWNED")
                val result = JSObject()
                result.put("state", "ITEM_ALREADY_OWNED")
                call?.resolve(result)
            }
            else -> {
                Log.e(TAG, "Purchase error: ${billingResult.responseCode} - ${billingResult.debugMessage}")
                call?.reject("Purchase failed: ${billingResult.debugMessage}", billingResult.responseCode.toString())
            }
        }
    }
}
