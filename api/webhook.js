// api/webhook.js - Stripe webhook handler
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the event data from Stripe
    const event = req.body;
    
    // Handle successful checkout
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Get user email from the session
      const userEmail = session.customer_email || 
                        session.customer_details?.email || 
                        session.client_reference_id;
      
      console.log(`💰 Payment received for: ${userEmail}`);
      
      if (userEmail) {
        // Update the user's subscription status in Supabase
        const { error } = await supabase
          .from('profiles')
          .update({ 
            subscription_status: 'active',
            stripe_customer_id: session.customer,
            updated_at: new Date().toISOString()
          })
          .eq('email', userEmail);
        
        if (error) {
          console.error('Error updating Supabase:', error);
          return res.status(500).json({ error: 'Database update failed' });
        }
        
        console.log(`✅ User ${userEmail} is now ACTIVE`);
      }
    }
    
    // Return success to Stripe
    res.status(200).json({ received: true });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: error.message });
  }
};
