jQuery(document).ready(function ($) {
    const pickupModalBody = $('#pickup-modal-body');
    const pickupMobileDatepicker = $('#mobile-datepicker');
    const pickupDateInput = $('#pickup-date');

    const dropoffModalBody = $('#dropoff-modal-body');
    const dropoffMobileDatepicker = $('#drop-mobile-datepicker');
    const dropoffDateInput = $('#dropoff-date');

    // --- Open the pickup modal ---
    pickupDateInput.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        pickupModalBody.show();

        setTimeout(function() {
            if (pickupMobileDatepicker.data('xdsoft_datetimepicker')) {
                pickupMobileDatepicker.datetimepicker({
                    onSelectDate: function(ct) {
                        const selectedDate = ct.dateFormat('m/d/Y');
                        console.log('Selected Pickup Date:', selectedDate);
                        alert('Selected Pickup Date: ' + selectedDate);
                    }
                });
            }
        }, 100);
    });

    // --- Open the dropoff modal ---
    dropoffDateInput.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropoffModalBody.show();

        setTimeout(function() {
            if (dropoffMobileDatepicker.data('xdsoft_datetimepicker')) {
                dropoffMobileDatepicker.datetimepicker({
                    onSelectDate: function(ct) {
                        const selectedDate = ct.dateFormat('m/d/Y');

                        console.log('Selected Dropoff Date:', selectedDate);
                        alert('Selected Dropoff Date: ' + selectedDate);
                    }
                });
            }
        }, 100);
    });

    // --- Close the modals ---
    $('#cal-close-btn, #drop-cal-close-btn').on('click', function () {
        pickupModalBody.hide();
        dropoffModalBody.hide();
    });
});