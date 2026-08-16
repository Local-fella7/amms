<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <?= $this->include('reports/partials/styles') ?>
</head>
<body>
    <?= $this->include('reports/partials/header') ?>

    <div class="summary">
        Member: <?= esc(trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''))) ?>
        (ID: <?= esc($member['id'] ?? '') ?>)
        <?php if (! empty($from) || ! empty($to)): ?>
            | Period: <?= esc($from ?? 'Start') ?> to <?= esc($to ?? 'Present') ?>
        <?php endif; ?>
    </div>

    <h2>Registration Details</h2>
    <table>
        <tr><th>Gender</th><td><?= esc(ucfirst($member['gender'] ?? '')) ?></td><th>Status</th><td><?= esc(ucfirst($member['member_status'] ?? '')) ?></td></tr>
        <tr><th>Location</th><td><?= esc($member['location_name'] ?? 'Unassigned') ?></td><th>Age Group</th><td><?= esc($member['age_group_name'] ?? 'Unassigned') ?></td></tr>
        <tr><th>Registration Date</th><td><?= esc($member['registration_date'] ?? '') ?></td><th>Phone</th><td><?= esc($member['phone'] ?? '') ?></td></tr>
    </table>

    <h2>Fee Payment History</h2>
    <?php if (empty($payments)): ?>
        <div class="empty">No fee payments recorded for this period.</div>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Fee</th>
                    <th>Payment Mode</th>
                    <th class="text-right">Amount</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($payments as $payment): ?>
                    <tr>
                        <td><?= esc($payment['date'] ?? '') ?></td>
                        <td><?= esc($payment['fee_name'] ?? '') ?></td>
                        <td><?= esc($payment['payment_mode_name'] ?? '') ?></td>
                        <td class="text-right"><?= esc(number_format((float) ($payment['amount'] ?? 0), 2)) ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <h2>Activity History</h2>
    <?php if (empty($activities)): ?>
        <div class="empty">No recorded profile changes for this period.</div>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>Date/Time</th>
                    <th>Feature</th>
                    <th>Changed By</th>
                    <th>Summary</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($activities as $activity): ?>
                    <tr>
                        <td><?= esc($activity['datetime'] ?? '') ?></td>
                        <td><?= esc($activity['feature_name'] ?? 'System') ?></td>
                        <td><?= esc(trim(($activity['user_first_name'] ?? '') . ' ' . ($activity['user_last_name'] ?? ''))) ?></td>
                        <td>
                            <?php if (! empty($activity['before']) && ! empty($activity['after'])): ?>
                                Profile updated
                            <?php elseif (! empty($activity['after'])): ?>
                                Profile created
                            <?php else: ?>
                                Profile removed
                            <?php endif; ?>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>

    <?= $this->include('reports/partials/footer') ?>
</body>
</html>
