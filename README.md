# La Pronto Pizza – Digital Ordering System

A complete digital ordering solution for La Pronto Pizza in Aalborg Øst, Denmark, built from scratch with HTML, CSS, JavaScript and PHP.

**Live website:** https://la-pronto.dk

## Features

- Online menu loaded from JSON with search and category filtering
- Shopping cart with product options and multiple sizes
- Secure payment flow with QuickPay
- Automatic email confirmations for both customer and restaurant
- Admin panel for managing menu items, prices, opening hours, scheduled closures and discount codes
- Delivery zone calculation using the Nominatim Geocoding API
- Danish and English language support
- Responsive design for desktop, tablet and mobile (iOS & Android)

## Tech Stack

- HTML
- CSS
- JavaScript
- PHP
- JSON
- QuickPay API
- SMTP
- one.com hosting

## Running the project

Clone the repository and replace the placeholder credentials with your own:

- `send-order.php` → SMTP credentials
- `auth.php` → Admin password
- `quickpay-create.php` → QuickPay API key
- `quickpay-callback.php` → QuickPay private key

## Portfolio note

This repository is intended for portfolio purposes. All sensitive information, including API keys, passwords and email credentials, has been replaced with placeholder values before publishing.
