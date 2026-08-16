<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <?= $this->include('reports/partials/styles') ?>
</head>
<body>
    <?= $this->include('reports/partials/header') ?>

    <?php if (! empty($feeId)): ?>
        <div class="summary">Filtered by fee ID: <?= esc($feeId) ?></div>
    <?php endif; ?>

    <?php if (empty($rows)): ?>
        <div class="empty">No outstanding balances found.</div>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Member</th>
                    <th>Fee</th>
                    <th>Year</th>
                    <th class="text-right">Fee Amount</th>
                    <th class="text-right">Total Paid</th>
                    <th class="text-right">Outstanding</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($rows as $row): ?>
                    <tr>
                        <td><?= esc(trim(($row['member_first_name'] ?? '') . ' ' . ($row['member_last_name'] ?? ''))) ?></td>
                        <td><?= esc($row['fee_name'] ?? '') ?></td>
                        <td><?= esc($row['fee_year'] ?? '') ?></td>
                        <td class="text-right"><?= esc(number_format((float) ($row['fee_amount'] ?? 0), 2)) ?></td>
                        <td class="text-right"><?= esc(number_format((float) ($row['total_paid'] ?? 0), 2)) ?></td>
                        <td class="text-right"><?= esc(number_format((float) ($row['outstanding'] ?? 0), 2)) ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <?= $this->include('reports/partials/footer') ?>
</body>
</html>
