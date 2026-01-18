import { useEffect } from 'react'
import { useAuth } from './useAuth'
import { useBookingStore } from '@/store/bookingStore'
import { supabase } from '@/lib/supabase'

/**
 * Hook to automatically sync booking data with database after user authentication
 * 
 * This hook monitors authentication state and booking data.
 * When a user logs in and has pending booking data, it automatically:
 * 1. Creates a draft order in the database
 * 2. Links the order to the authenticated user
 * 3. Updates the bookingStore with the order ID
 * 
 * Usage: Call this hook in pages that require booking data sync (Checkout, Professional Selection, etc.)
 */
export function useSyncBookingOnAuth() {
    const { user } = useAuth()
    const {
        orderId,
        cartItems,
        totalAmount,
        installationAddress,
        setOrderId
    } = useBookingStore()

    useEffect(() => {
        const syncBooking = async () => {
            // Only sync if:
            // 1. User is authenticated
            // 2. We have booking data (cart items, address, amount)
            // 3. We don't already have an order ID
            if (!user || orderId || cartItems.length === 0 || !installationAddress) {
                return
            }

            console.log('Syncing booking data with database...')

            try {
                // Create draft order in database
                const { data: order, error } = await supabase
                    .from('orders')
                    .insert({
                        customer_id: user.id,
                        order_number: `DRAFT-${Date.now()}`,
                        status: 'draft' as any,
                        installation_address: installationAddress,
                        total: totalAmount,
                    } as any)
                    .select()
                    .single()

                if (error) {
                    console.error('Error creating draft order:', error)
                    return
                }

                // Update store with the new order ID
                console.log('Order created successfully:', order.id)
                setOrderId(order.id)

            } catch (err) {
                console.error('Failed to sync booking data:', err)
            }
        }

        syncBooking()
    }, [user, orderId, cartItems, totalAmount, installationAddress, setOrderId])

    return { isSynced: !!orderId }
}
