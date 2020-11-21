<?php
/**
 * Regular expression patterns per country code
 *
 * @link http://ec.europa.eu/taxation_customs/vies/faq.html?locale=lt#item_11
 * @package Invoicing/data
 */

defined( 'ABSPATH' ) || exit;

array(

    'AT' => 'U[A-Z\d]{8}',
    'BE' => '[0|1]{1}\d{9}',
    'BG' => '\d{9,10}',
    'CH' => 'E(-| ?)(\d{3}(\.)\d{3}(\.)\d{3}|\d{9})( ?)(MWST|TVA|IVA)',
    'CY' => '\d{8}[A-Z]',
    'CZ' => '\d{8,10}',
    'DE' => '\d{9}',
    'DK' => '(\d{2} ?){3}\d{2}',
    'EE' => '\d{9}',
    'EL' => '\d{9}',
    'ES' => '[A-Z]\d{7}[A-Z]|\d{8}[A-Z]|[A-Z]\d{8}',
    'FI' => '\d{8}',
    'FR' => '([A-Z0-9]{2})\d{9}',
    'GB' => '\d{9}|\d{12}|(GD|HA)\d{3}',
    'HR' => '\d{11}',
    'HU' => '\d{8}',
    'IE' => '[A-Z\d]{8}|[A-Z\d]{9}',
    'IT' => '\d{11}',
    'LT' => '(\d{9}|\d{12})',
    'LU' => '\d{8}',
    'LV' => '\d{11}',
    'MT' => '\d{8}',
    'NL' => '\d{9}B\d{2}',
    'NO' => '\d{9}(MVA){0,1}',
    'PL' => '\d{10}',
    'PT' => '\d{9}',
    'RO' => '\d{2,10}',
    'SE' => '\d{12}',
    'SI' => '\d{8}',
    'SK' => '\d{10}'

);