jQuery(function($) {

    /**
     * Simple throttle function
     * @param function callback The callback function
     * @param int limit The number of milliseconds to wait for
     */
    function gp_throttle (callback, limit) {

        // Ensure we have a limit.
        if ( ! limit ) {
            limit = 200
        }

        // Initially, we're not waiting
        var wait = false;

        // Ensure that the last call was handled
        var did_last = true;

        // We return a throttled function
        return function () {

            // If we're not waiting
            if ( ! wait ) {

                // We did the last action.
                did_last = true;

                // Execute users function
                callback.bind(this).call();

                // Prevent future invocations
                wait = true;

                // For a period of time...
                setTimeout(function () {

                    // then allow future invocations
                    wait = false;

                }, limit);

            // If we're waiting...
            } else {

                // We did not do the last action.
                did_last = false;

                // Wait for a period of time...
                var that = this
                setTimeout(function () {

                    // then ensure that we did the last call.
                    if ( ! did_last ) {
                        callback.bind(that).call();
                        did_last = true
                    }

                }, limit);

            }

        }
    }

    // A local cache of prices.
    var cached_prices = {}

    // Fetch prices from the server.
    var get_prices = function( form, form_data ) {

        wpinvBlock(form);

        return $.post( WPInv.ajax_url, form_data + '&action=wpinv_payment_form_refresh_prices&_ajax_nonce=' + WPInv.formNonce )

            .done( function( res ) {

                // We have prices.
                if ( res.success ) {

                    // Cache the data.
                    cached_prices[ form_data ] = res.data
                    return;

                }

                // An error occured.
                form.find('.getpaid-payment-form-errors').html(res).removeClass('d-none')

            } )

            .fail( function( res ) {
                form.find('.getpaid-payment-form-errors').html(WPInv.connectionError).removeClass('d-none')
            } )

            .always(() => {
                form.unblock();
            })

        }

    /**
     * Refresh prices from the cache.
     */
    var handle_refresh = function( form, form_data ) {

        // Hide any errors.
        form.find('.getpaid-payment-form-errors').html('').addClass('d-none')

        var data = cached_prices[ form_data ]

        // Process totals.
        if ( data.totals ) {

            for ( var total in data.totals ) {
                if ( data.totals.hasOwnProperty( total ) ) {
                    form.find('.getpaid-form-cart-totals-total-' + total).html(data.totals[total])
                }
            }

        }

        // Process item sub-totals.
        if ( data.items ) {

            for ( var item in data.items ) {
                if ( data.items.hasOwnProperty( item ) ) {
                    form.find('.getpaid-form-cart-item-subtotal-' + item).html(data.items[item])
                }
            }

        }
    }

    /**
     * Refresh prices either from cache or from the server.
     */
    var refresh_prices = function( form ) {

        // Get form data.
        var form_data = form.serialize()

        // If we have the items in the cache...
        if ( cached_prices[ form_data ] ) {
            handle_refresh( form, form_data )
            return
        }

        get_prices( form, form_data ).done( function () {
            if ( cached_prices[ form_data ] ) {
                handle_refresh( form, form_data )
            }
        })

    }


    // Handles field changes.
    var on_field_change = function() {

        // Sanitize the value.
        $(this).val( $(this).val().replace(/[^0-9\.]/g,'') )

        // Ensure that we have a value.
        if ( '' == $(this).val() ) {
            $(this).val('1')
        }

        // Refresh prices.
        refresh_prices( $( this ).closest('.getpaid-payment-form') )
    }

    // Refresh when custom prices change.
    $( 'body').on( 'input', '.getpaid-item-price-input', gp_throttle( on_field_change, 500 ) );

    // Refresh when quantities change.
    $( 'body').on( 'change', '.getpaid-item-quantity-input', gp_throttle( on_field_change, 500 ) );

    // Refresh when country changes.
    $( 'body').on( 'change', '#wpinv_country', function() {

        var form = $( this ).closest('.getpaid-payment-form')
        if ( form.find('#wpinv_state').length ) {

            wpinvBlock( form.find('.wpinv_state') );

                data = {
                    action: 'wpinv_get_payment_form_states_field',
                    country: $(this).val(),
                    form: form.find('input[name="form_id"]').val()
                };

                $.get(ajaxurl, data, function( res ) {

                    if ( 'object' == typeof res ) {
                        form.find('.wpinv_state').html( res.data )
                    }

                })

                .always( function(data) {
                    form.find('.wpinv_state').unblock()
                });

        }

        refresh_prices( form )
    } );

    // Refresh when state changes.
    $( 'body').on( 'change', '#wpinv_state', function() {
        refresh_prices( $( this ).closest('.getpaid-payment-form') )
    } );


    $( 'body').on( 'input', '.wpinv_payment_form .wpinv-items-selector', function( e ) {

        var form  = $( this ).closest('.wpinv_payment_form')
        var total = 0.0
        var val   = $( this ).val()

        form.find( '.wpinv-items-selector' ).each( function() {
            var id = $(this).val()
            form.find( '*[data-id="' + id +'"]' )
                .addClass('d-none')
                .find('input:not(.wpinv-item-quantity-input)')
                .attr('name', '')
        })

        form
            .find( '*[data-id="' + val +'"]' )
            .removeClass('d-none')
            .find('input:not(.wpinv-item-quantity-input)')
            .attr('name', 'wpinv-items[' + val + ']')

        // Taxes.
        if ( form.find('.wpinv-items-tax').length ) {
            return;
        }

        // Calculate the total of all items.
        form.find( '.wpinv-item-price-input' ).each( function() {

            if ( 0 == $( this ).attr('name').length ) {
                return;
            }

            var value = parseFloat( $(this).val() )

            var quantity = parseInt( $(this).closest('.item_totals_item').find('.wpinv-item-quantity-input').val() )

            if ( isNaN( quantity ) || 1 > quantity ) {
                quantity = 1;
            }

            if ( ! isNaN( value ) ) {
                total = total + ( value * quantity );
            }

        })

        // Format the total.
        total = total.toFixed(2) + '';
        var parts = total.toString().split('.');
		parts[0]  = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		total =  parts.join('.');

        var totals = form.find( '.wpinv-items-total' )

        if ( 'left' == totals.data('currency-position') ) {
            totals.text( totals.data('currency') + total )
        } else {
            totals.text( total + totals.data('currency') )
        }

    })

    $( 'body').on( 'change', '.wpinv_payment_form .wpinv-items-select-selector', function( e ) {

        var form  = $( this ).closest('.wpinv_payment_form')
        var total = 0.0
        var val   = $( this ).val()

        form.find( '.wpinv-items-select-selector option' ).each( function() {
            var id = $(this).val()
            form.find( '*[data-id="' + id +'"]' )
                .addClass('d-none')
                .find('input:not(.wpinv-item-quantity-input)')
                .attr('name', '')
        })

        form
            .find( '*[data-id="' + val +'"]' )
            .removeClass('d-none')
            .find('input:not(.wpinv-item-quantity-input)')
            .attr('name', 'wpinv-items[' + val + ']')

        // Taxes.
        if ( form.find('.wpinv-items-tax').length ) {
            return;
        }

        // Calculate the total of all items.
        form.find( '.wpinv-item-price-input' ).each( function() {

            if ( 0 == $( this ).attr('name').length ) {
                return;
            }

            var value = parseFloat( $(this).val() )

            var quantity = parseInt( $(this).closest('.item_totals_item').find('.wpinv-item-quantity-input').val() )

            if ( isNaN( quantity ) || 1 > quantity ) {
                quantity = 1;
            }

            if ( ! isNaN( value ) ) {
                total = total + ( value * quantity );
            }

        })

        // Format the total.
        total = total.toFixed(2) + '';
        var parts = total.toString().split('.');
		parts[0]  = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		total =  parts.join('.');

        var totals = form.find( '.wpinv-items-total' )

        if ( 'left' == totals.data('currency-position') ) {
            totals.text( totals.data('currency') + total )
        } else {
            totals.text( total + totals.data('currency') )
        }

    })

    $( 'body').on( 'change', '.wpinv_payment_form .wpinv-items-multiselect-selector', function( e ) {

        var form  = $( this ).closest('.wpinv_payment_form')
        var total = 0.0

        form.find( '.wpinv-items-select-selector option' ).each( function() {
            var id = $(this).val()
            form.find( '*[data-id="' + id +'"]' )
                .addClass('d-none')
                .find('input:not(.wpinv-item-quantity-input)')
                .attr('name', '')
        })

        var val = $( this ).val()

        if ( val ) {
            $( val ).each( function( key, _val ) {

                form
                    .find( '*[data-id="' + _val +'"]' )
                    .removeClass('d-none')
                    .find('input:not(.wpinv-item-quantity-input)')
                    .attr('name', 'wpinv-items[' + _val + ']')

            })
        }

        // Taxes.
        if ( form.find('.wpinv-items-tax').length ) {
            return;
        }

        // Calculate the total of all items.
        form.find( '.wpinv-item-price-input' ).each( function() {

            if ( 0 == $( this ).attr('name').length ) {
                return;
            }

            var value = parseFloat( $(this).val() )

            var quantity = parseInt( $(this).closest('.item_totals_item').find('.wpinv-item-quantity-input').val() )

            if ( isNaN( quantity ) || 1 > quantity ) {
                quantity = 1;
            }

            if ( ! isNaN( value ) ) {
                total = total + ( value * quantity );
            }

        })

        // Format the total.
        total = total.toFixed(2) + '';
        var parts = total.toString().split('.');
		parts[0]  = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		total =  parts.join('.');

        var totals = form.find( '.wpinv-items-total' )

        if ( 'left' == totals.data('currency-position') ) {
            totals.text( totals.data('currency') + total )
        } else {
            totals.text( total + totals.data('currency') )
        }

    })

    $( 'body').on( 'change', '.wpi-payment-form-items-select-checkbox', function( e ) {

        var form  = $( this ).closest('.wpinv_payment_form')
        var total = 0.0

        form.find( '.wpi-payment-form-items-select-checkbox' ).each( function() {
            var id = $(this).val()
            form.find( '*[data-id="' + id +'"]' )
                .addClass('d-none')
                .find('input:not(.wpinv-item-quantity-input)')
                .attr('name', '')
        })

        form.find('.wpi-payment-form-items-select-checkbox:checked').each(function(){
            var val = $(this).val()

            form
                .find( '*[data-id="' + val +'"]' )
                .removeClass('d-none')
                .find('input:not(.wpinv-item-quantity-input)')
                .attr('name', 'wpinv-items[' + val + ']')
        });

        // Taxes.
        if ( form.find('.wpinv-items-tax').length ) {
            return;
        }

        // Calculate the total of all items.
        form.find( '.wpinv-item-price-input' ).each( function() {

            if ( 0 == $( this ).attr('name').length ) {
                return;
            }

            var value = parseFloat( $(this).val() )

            var quantity = parseInt( $(this).closest('.item_totals_item').find('.wpinv-item-quantity-input').val() )

            if ( isNaN( quantity ) || 1 > quantity ) {
                quantity = 1;
            }

            if ( ! isNaN( value ) ) {
                total = total + ( value * quantity );
            }

        })

        // Format the total.
        total = total.toFixed(2) + '';
        var parts = total.toString().split('.');
		parts[0]  = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		total =  parts.join('.');

        var totals = form.find( '.wpinv-items-total' )

        if ( 'left' == totals.data('currency-position') ) {
            totals.text( totals.data('currency') + total )
        } else {
            totals.text( total + totals.data('currency') )
        }

    })

    // Apply discounts.
    var applyDiscount = function( form ) {

        // Block the discount field.
        var discount_field = form.find( '.discount_field' )
        wpinvBlock(discount_field);

        // Hide coupon errors.
        var errors = discount_field.find( '.wpinv_payment_form_coupon_errors' ).html('').addClass('d-none')

        // And submit the form to create an invoice and apply the discount.
        var data = form.serialize();

        $.post( WPInv.ajax_url, data + '&action=wpinv_payment_form_discount', function(res) {

            if ( res.success ) {
                $( form ).find('.wpinv-items-total').html( res.data.total )
                $( form ).find('.wpinv-items-tax').html( res.data.tax )
                $( form ).find('.wpinv-items-sub-total').html( res.data.sub_total )

                if ( res.data.discount ) {
                    $( form ).find('.wpinv-items-discount').html( res.data.discount ).closest('.row').show()
                } else {
                    $( form ).find('.wpinv-items-discount').closest('.row').hide()
                }

                if ( res.data.free && ! res.data.has_recurring ) {
                    form.find('#wpinv_payment_mode_select').hide()
                } else {
                    form.find('#wpinv_payment_mode_select').show()
                }

            } else {
                errors.html(res).removeClass('d-none')
            }

        })

        .fail( function( res ) {
            errors.html('Could not establish a connection to the server.').removeClass('d-none')
        } )

        .always(() => {
            discount_field.unblock();
        })

    }

    // Apply a discount when the discount button is clicked.
    $( 'body').on('click', '.wpinv_payment_form .getpaid-discount-button', function( e ) {
        e.preventDefault();
        applyDiscount( $( this ).closest('.wpinv_payment_form') )
    } );

    //Apply a discount when hitting enter key in the discount field
    $( 'body').on('keypress', '.wpinv_payment_form .getpaid-discount-field', function( e ) {
        if ( e.keyCode == '13' ) {
            e.preventDefault();
            applyDiscount( $( this ).closest('.wpinv_payment_form') )
        }
    });

    // When the discount value changes.
    $( 'body').on('change', '.wpinv_payment_form .getpaid-discount-field', function( e ) {
        if ( $( this ).val().length != 0 ) {
            applyDiscount( $( this ).closest('.wpinv_payment_form') )
        }
    });

    window.wpinvPaymentFormSubmt = true
    window.wpinvPaymentFormDelaySubmit = false
    window.wpinvPaymentFormData = ''
    $( document ).on( 'submit', '.wpinv_payment_form', function( e ) {

        // Do not submit the form.
        e.preventDefault();

        // Set defaults
        wpinvPaymentFormSubmt = true
        wpinvPaymentFormDelaySubmit = false
        wpinvPaymentFormData = ''

        // instead, display a loading indicator.
        var form = $( this )
        wpinvBlock(form);

        // Then hide the errors
        var errors_el = form.find( '.wpinv_payment_form_errors' )
        errors_el.html('').addClass('d-none')

        // And submit the form to create an invoice.
        var data = form.serialize();
        wpinvPaymentFormData = data

        $( 'body' ).trigger( 'wpinv_payment_form_before_submit', form );

        if ( ! window.wpinvPaymentFormSubmt ) {
            form.unblock();
            return;
        }

        var submit = function () {
            return $.post(WPInv.ajax_url, wpinvPaymentFormData + '&action=wpinv_payment_form', function (res) {

                if ('string' == typeof res) {
                    errors_el.html(res).removeClass('d-none')
                    form.unblock();
                    return
                }

                if (res.success) {
                    window.location.href = decodeURIComponent(res.data)
                    return
                }

                errors_el.html(res.data).removeClass('d-none')
                form.unblock();

            })

                .fail(function (res) {
                    errors_el.html('Could not establish a connection to the server.').removeClass('d-none')
                    form.unblock();
                })

        }

        if ( wpinvPaymentFormDelaySubmit ) {
            var local_submit = function() {

                if ( ! window.wpinvPaymentFormSubmt ) {
                    form.unblock();
                } else {
                    submit()
                }

                $('body').unbind( 'wpinv_payment_form_delayed_submit', local_submit )

            }
            $('body').bind( 'wpinv_payment_form_delayed_submit', local_submit )

        } else {
            submit()
        }

    })

    $('body').on('click', 'input[name="wpi-gateway"]', function ( e ) {

        var form = $( this ).closest( '.getpaid-payment-form' );
        var is_checked = $(this).is(':checked')

        if ($('.wpi-payment_methods input.wpi-pmethod').length > 1) {

            var target_payment_box = form.find('div.payment_box.' + $(this).attr('ID'));
            if ( is_checked && !target_payment_box.is(':visible') ) {

                // Hide all visible payment methods.
                form.find('div.payment_box').filter(':visible').slideUp(250);
                if ($(this).is(':checked')) {
                    var content = $('div.payment_box.' + $(this).attr('ID')).html();
                    content = content ? content.trim() : '';
                    if (content) {
                        $('div.payment_box.' + $(this).attr('ID')).slideDown(250);
                    }
                }
            }

        } else {

            $('div.payment_box').show();

        }
        $('#wpinv_payment_mode_select').attr('data-gateway', $(this).val());
        wpinvSetPaymentBtnText($(this), $('#wpinv_payment_mode_select').data('free'));
    });

    // Set's up a checkout form. refresh_prices
    var setup_form = function( form ) {

        form.find('.payment_box .form-horizontal .form-group').addClass('row')

        var gateways = form.find('.getpaid-payment-form-element-gateway_select input[name="wpi-gateway"]');

        // If there is one method, we can hide the radio input and the title.
        if ( 1 === gateways.length ) {
            gateways.eq(0).hide();
            form.find('.wpi-payment_methods_title').hide()
        }

        if ( gateways.length === 0) {
            form.find('.wpi-payment_methods_title').hide()
            form.find('.getpaid-payment-form-submit').prop( 'disabled', true ).css('cursor', 'not-allowed');
        }

        // If there are none selected, select the first.
        if ( 0 === gateways.filter(':checked').length ) {
            gateways.eq(0).prop( 'checked', true );
        }

        // Trigger click event for selected gateway.
        gateways.filter(':checked').eq(0).trigger('click');

    }

    // Set up all active forms.
    $('.getpaid-payment-form').each( function() {
        setup_form( $( this ) );
    } )

    // Payment buttons.
    $( document ).on( 'click', '.getpaid-payment-button', function( e ) {

        // Do not submit the form.
        e.preventDefault();

        // Add the loader.
        $('#getpaid-payment-modal .modal-body')
            .html( '<div class="d-flex align-items-center justify-content-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>' )

        // Display the modal.
        $('#getpaid-payment-modal').modal()

        // Load the form via ajax.
        var data    = $( this ).data()
        data.action = 'wpinv_get_payment_form'

        $.get( WPInv.ajax_url, data, function (res) {
            $('#getpaid-payment-modal .modal-body').html( res )
            $('#getpaid-payment-modal').modal('handleUpdate')
            $('#getpaid-payment-modal .getpaid-payment-form').each( function() {
                setup_form( $( this ) );
            } )
        })

        .fail(function (res) {
            $('#getpaid-payment-modal .modal-body').html(WPInv.connectionError)
            $('#getpaid-payment-modal').modal('handleUpdate')
        })

    } )

});
