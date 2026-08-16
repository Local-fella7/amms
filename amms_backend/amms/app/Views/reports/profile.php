<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <?= $this->include('reports/partials/styles') ?>
</head>
<body>
    <?= $this->include('reports/partials/header') ?>

    <table class="profile-grid">
        <tr>
            <td style="width: 100px;">
                <?php if (! empty($photoPath)): ?>
                    <img src="<?= esc($photoPath) ?>" alt="Member photo" class="profile-photo">
                <?php else: ?>
                    <div class="profile-photo" style="text-align:center;line-height:90px;background:#edf2f7;">No Photo</div>
                <?php endif; ?>
            </td>
            <td>
                <strong style="font-size:14px;"><?= esc(trim(($member['first_name'] ?? '') . ' ' . ($member['last_name'] ?? ''))) ?></strong><br>
                <span class="badge"><?= esc(ucfirst($member['member_status'] ?? '')) ?></span>
                <span class="badge"><?= esc(ucfirst($member['gender'] ?? '')) ?></span>
            </td>
        </tr>
    </table>

    <table>
        <tr><th>Father's Name</th><td><?= esc($member['fathers_name'] ?? '') ?></td><th>Mother's Name</th><td><?= esc($member['mothers_name'] ?? '') ?></td></tr>
        <tr><th>Date of Birth</th><td><?= esc($member['date_of_birth'] ?? '') ?></td><th>Marital Status</th><td><?= esc(ucfirst($member['marital_status'] ?? '')) ?></td></tr>
        <tr><th>Phone</th><td><?= esc($member['phone'] ?? '') ?></td><th>Registration Date</th><td><?= esc($member['registration_date'] ?? '') ?></td></tr>
        <tr><th>Location</th><td><?= esc($member['location_name'] ?? 'Unassigned') ?></td><th>Age Group</th><td><?= esc($member['age_group_name'] ?? 'Unassigned') ?></td></tr>
        <tr><th>Fee Exemption</th><td><?= esc(ucfirst($member['fee_exemption'] ?? 'no')) ?></td><th>Member ID</th><td><?= esc($member['id'] ?? '') ?></td></tr>
    </table>

    <h2>Fee Payment Summary</h2>
    <?php if (empty($payments)): ?>
        <div class="empty">No fee payments recorded.</div>
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

    <?= $this->include('reports/partials/footer') ?>
</body>
</html>
