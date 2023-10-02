import TicketTypeRequest from './lib/TicketTypeRequest.js';
import InvalidPurchaseException from './lib/InvalidPurchaseException.js';

class TicketService {

  // Inject third party services
  constructor(ticketPaymentService, seatReservationService) {
    this.ticketPaymentService = ticketPaymentService;
    this.seatReservationService = seatReservationService;
  }

  /**
   * Calculates the total price for a given ticket type and quantity.
   * @param {string} ticketType - The type of ticket (e.g., 'ADULT', 'CHILD', 'INFANT').
   * @param {number} quantity - The quantity of tickets to purchase.
   * @returns {number} - The total price for the tickets.
   */
  calculateTicketPrice(ticketType, quantity) {
    // Ticket prices based on the provided table
    const ticketPrices = {
      INFANT: 0,
      CHILD: 10,
      ADULT: 20,
    };

    if (!(ticketType in ticketPrices)) {
      throw new InvalidPurchaseException('Invalid ticket type');
    }

    return ticketPrices[ticketType] * quantity;
  }

  /**
   * Purchase tickets based on the provided ticket type requests.
   * @param {number} accountId - The account ID of the purchaser.
   * @param {...TicketTypeRequest} ticketTypeRequests - Variable number of ticket type requests.
   * @throws {InvalidPurchaseException} If the purchase is invalid.
   */
  purchaseTickets(accountId, ...ticketTypeRequests) {
    // Validate the total number of tickets requested
    const totalTicketsRequested = ticketTypeRequests.reduce(
      (total, request) => total + request.getNoOfTickets(),
      0
    );

    if (totalTicketsRequested > 20) {
      throw new InvalidPurchaseException('Exceeded maximum ticket limit (20)');
    }

    // Track the number of Adult, Child, and Infant tickets requested
    let adultTickets = 0;
    let childTickets = 0;
    let infantTickets = 0;

    for (const request of ticketTypeRequests) {
      const ticketType = request.getTicketType();
      const quantity = request.getNoOfTickets();

      if (ticketType === 'ADULT') {
        adultTickets += quantity;
      } else if (ticketType === 'CHILD') {
        childTickets += quantity;
      } else if (ticketType === 'INFANT') {
        infantTickets += quantity;
      }
    }

    // Check if Child or Infant tickets are purchased without an Adult ticket
    if (childTickets > 0 && adultTickets === 0) {
      throw new InvalidPurchaseException('Child tickets cannot be purchased without an Adult ticket');
    }

    if (infantTickets > 0 && adultTickets === 0) {
      throw new InvalidPurchaseException('Infant tickets cannot be purchased without an Adult ticket');
    }

    // Calculate the total price for the requested tickets
    let totalPrice = 0;

    for (const request of ticketTypeRequests) {
      const ticketType = request.getTicketType();
      const quantity = request.getNoOfTickets();
      totalPrice += this.calculateTicketPrice(ticketType, quantity);
    }

    try {
      // Make a payment request to the TicketPaymentService
      this.ticketPaymentService.makePayment(accountId, totalPrice);
  
      // Reserve seats based on the ticket type requests
      for (const request of ticketTypeRequests) {
        const ticketType = request.getTicketType();
        const quantity = request.getNoOfTickets();
  
        // Only reserve seats for ADULT and CHILD tickets
        if (ticketType !== 'INFANT') {
          this.seatReservationService.reserveSeat(accountId, quantity);
        }
      }
    } catch (error) {
      // Handle exceptions that may occur during payment or seat reservation
      // Log the error, roll back any changes, or take appropriate actions
      console.error('Error during payment or seat reservation:', error.message);
  
      // Rethrow the error if necessary
      throw error;
    }
  }
}

export default TicketService;
