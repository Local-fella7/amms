<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <?= $this->include('reports/partials/styles') ?>
</head>
<body>
    <?= $this->include('reports/partials/header') ?>

    <?php if (! empty($filters)): ?>
        <div class="summary">
            Filters:
            <?php if (! empty($filters['member_id'])): ?> Member ID <?= esc($filters['member_id']) ?><?php endif; ?>
            <?php if (! empty($filters['fee_id'])): ?> | Fee ID <?= esc($filters['fee_id']) ?><?php endif; ?>
            <?php if (! empty($filters['from'])): ?> | From <?= esc($filters['from']) ?><?php endif; ?>
            <?php if (! empty($filters['to'])): ?> | To <?= esc($filters['to']) ?><?php endif; ?>
        </div>
    <?php endif; ?>

    <?php if (empty($rows)): ?>
        <div class="empty">No fee payments found.</div>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Member</th>
                    <th>Fee</th>
                    <th>Year</th>
                    <th>Payment Mode</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                <?php $total = 0; ?>
                <?php foreach ($rows as $row): ?>
                    <?php $total += (float) ($row['amount'] ?? 0); ?>
                    <tr>
                        <td><?= esc($row['date'] ?? '') ?></td>
                        <td><?= esc(trim(($row['member_first_name'] ?? '') . ' ' . ($row['member_last_name'] ?? ''))) ?></td>
                        <td><?= esc($row['fee_name'] ?? '') ?></td>
                        <td><?= esc($row['fee_year'] ?? '') ?></td>
                        <td><?= esc($row['payment_mode_name'] ?? '') ?></td>
                        <td class="text-right"><?= esc(number_format((float) ($row['amount'] ?? 0), 2)) ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
            <tfoot>
                <tr>
                    <th colspan="5" class="text-right">Total</th>
                    <th class="text-right"><?= esc(number_format($total, 2)) ?></th>
                </tr>
            </tfoot>
        </table>
    <?php endif; ?>

    <?= $this->include('reports/partials/footer') ?>
</body>
</html>
