import stripe
from app.core.config import settings

class StripeClient:
    def __init__(self):
        if not settings.STRIPE_SECRET_KEY:
            raise RuntimeError("STRIPE_SECRET_KEY not configured")
        stripe.api_key = settings.STRIPE_SECRET_KEY
        self.api = stripe

    def create_checkout_session(self, *, amount_cents: int, currency: str, invoice_id: str, customer_email: str | None):
        # Use Payment Intents under the hood; pass invoice metadata for reconciliation
        session = self.api.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": currency,
                    "product_data": {"name": "Insurance premium"},
                    "unit_amount": amount_cents,
                },
                "quantity": 1,
            }],
            success_url=settings.PAYMENTS_SUCCESS_URL + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=settings.PAYMENTS_CANCEL_URL,
            customer_email=customer_email,
            payment_intent_data={
                "metadata": {"invoice_id": invoice_id},
            },
            metadata={"invoice_id": invoice_id},
        )
        return session

    def retrieve_payment_intent(self, payment_intent_id: str):
        return self.api.PaymentIntent.retrieve(payment_intent_id)

    def construct_event(self, payload: bytes, sig_header: str):
        if not settings.STRIPE_WEBHOOK_SECRET:
            raise RuntimeError("STRIPE_WEBHOOK_SECRET not configured")
        return self.api.Webhook.construct_event(
            payload=payload, sig_header=sig_header, secret=settings.STRIPE_WEBHOOK_SECRET
        )

    def retrieve_session(self, session_id: str):
        return self.api.checkout.Session.retrieve(session_id, expand=["payment_intent", "payment_intent.charges"])