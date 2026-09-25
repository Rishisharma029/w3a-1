"use strict";

const { v4: uuid } = require("uuid");

class PurchaseRecord {
  constructor(userRequest) {
    this.purchaseId      = "PUR-" + uuid();
    this.userRequest     = userRequest;
    this.startedAt       = new Date().toISOString();
    this.state           = "IDLE";
    this.intent          = null;

    this.discoveredProviders = [];
    this.filteredOut         = [];

    this.selectedProviderId  = null;
    this.selectedServiceId   = null;
    this.selectionReason     = null;
    this.providerRanking     = [];

    this.reqId           = null;
    this.quotedPrice     = null;
    this.authorizedAmount= null;
    this.txHash          = null;
    this.paymentAttempts = 0;

    this.receipt         = null;
    this.contentHash     = null;
    this.verified        = false;

    this.finalState      = null;
    this.completedAt     = null;
    this.retried         = false;
    this.fallbackUsed    = false;
    this.rejectionReason = null;
    this.errorDetail     = null;
    this.stateHistory    = [{ state: "IDLE", timestamp: this.startedAt }];
  }

  transition(newState, meta = {}) {
    this.state = newState;
    this.stateHistory.push({ state: newState, timestamp: new Date().toISOString(), ...meta });
  }

  setIntent(intent) {
    this.intent = intent;
    this.transition("INTENT_PARSED", { intent });
  }

  setDiscovery({ providers, filteredOut }) {
    this.discoveredProviders = providers.map((p) => p.providerId);
    this.filteredOut         = filteredOut;
    this.transition("DISCOVERED", { count: providers.length, filteredOut: filteredOut.map((f) => f.providerId) });
  }

  setSelection({ providerId, serviceId, reason, ranking }) {
    this.selectedProviderId = providerId;
    this.selectedServiceId  = serviceId;
    this.selectionReason    = reason;
    this.providerRanking    = ranking;
    this.transition("SELECTED", { providerId, serviceId, reason });
  }

  setPaymentRequired(reqId, price) {
    this.reqId       = reqId;
    this.quotedPrice = price;
    this.paymentAttempts++;
    this.transition("PAYMENT_REQUIRED", { reqId, price });
  }

  setAuthorized(authorizedAmount, txHash) {
    this.authorizedAmount = authorizedAmount;
    this.txHash           = txHash;
    this.transition("AUTHORIZED", { authorizedAmount, txHash });
  }

  setDelivered(receipt) {
    this.receipt     = receipt;
    this.contentHash = receipt.contentHash;
    this.transition("DELIVERED", { receiptId: receipt.receiptId, contentHash: receipt.contentHash });
  }

  setVerified(verified, detail = null) {
    this.verified = verified;
    this.transition(verified ? "VERIFIED" : "VERIFICATION_FAILED", { detail });
  }

  setRetried() {
    this.retried = true;
    this.transition("RETRY_DETECTED");
  }

  setFallback(failedProviderId, newProviderId) {
    this.fallbackUsed = true;
    this.transition("FALLBACK", { failedProviderId, newProviderId });
  }

  setRejected(reason) {
    this.rejectionReason = reason;
    this.finalState      = "REJECTED";
    this.completedAt     = new Date().toISOString();
    this.transition("REJECTED", { reason });
  }

  setComplete() {
    this.finalState  = "COMPLETE";
    this.completedAt = new Date().toISOString();
    this.transition("COMPLETE");
  }

  setFailed(error) {
    this.errorDetail = error;
    this.finalState  = "FAILED";
    this.completedAt = new Date().toISOString();
    this.transition("FAILED", { error });
  }

  toJSON() {
    return {
      purchaseId:          this.purchaseId,
      userRequest:         this.userRequest,
      startedAt:           this.startedAt,
      completedAt:         this.completedAt,
      finalState:          this.finalState,
      intent:              this.intent,
      discoveredProviders: this.discoveredProviders,
      filteredOut:         this.filteredOut,
      selectedProviderId:  this.selectedProviderId,
      selectedServiceId:   this.selectedServiceId,
      selectionReason:     this.selectionReason,
      providerRanking:     this.providerRanking,
      reqId:               this.reqId,
      quotedPrice:         this.quotedPrice,
      authorizedAmount:    this.authorizedAmount,
      txHash:              this.txHash,
      paymentAttempts:     this.paymentAttempts,
      receipt:             this.receipt,
      contentHash:         this.contentHash,
      verified:            this.verified,
      retried:             this.retried,
      fallbackUsed:        this.fallbackUsed,
      rejectionReason:     this.rejectionReason,
      errorDetail:         this.errorDetail,
      stateHistory:        this.stateHistory,
    };
  }
}

module.exports = { PurchaseRecord };
