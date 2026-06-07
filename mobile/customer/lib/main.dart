import 'package:flutter/material.dart';

void main() {
  runApp(const HabeshaGoCustomerApp());
}

class HabeshaGoCustomerApp extends StatelessWidget {
  const HabeshaGoCustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HabeshaGo',
      theme: ThemeData(colorSchemeSeed: const Color(0xFF0F5132), useMaterial3: true),
      home: const CustomerHome(),
    );
  }
}

class CustomerHome extends StatelessWidget {
  const CustomerHome({super.key});

  @override
  Widget build(BuildContext context) {
    final features = [
      'Browse restaurants and stores',
      'Voice search and voice checkout',
      'Offline order queue with SQLite',
      'Wallet, COD, and order tracking',
      'Senior, family, child, and night safety modes',
      'Diaspora ordering ready'
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('HabeshaGo Customer')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Bole pilot experience', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          ...features.map((feature) => Card(child: ListTile(leading: const Icon(Icons.check_circle), title: Text(feature)))),
          const SizedBox(height: 12),
          FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.mic), label: const Text('Start Tenagn voice mode')),
        ],
      ),
    );
  }
}
