<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["error" => "Only POST method allowed"]);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["error" => "Invalid JSON input"]);
    exit;
}

// Extract data
$company   = $data['company'] ?? 'My Company';
$client    = $data['client'] ?? 'Client Name';
$invoice_no = $data['invoice_no'] ?? '001';
$date      = $data['date'] ?? date('Y-m-d');
$items     = $data['items'] ?? [];

// Calculate total
$total = 0;
foreach ($items as $item) {
    $total += ($item['qty'] ?? 0) * ($item['price'] ?? 0);
}

// Build response
$response = [
    "status"     => "success",
    "invoice_no" => $invoice_no,
    "company"    => $company,
    "client"     => $client,
    "date"       => $date,
    "items"      => $items,
    "total"      => $total,
    "currency"   => "USD"
];

echo json_encode($response);