import 'package:flutter/material.dart';

void main() {
  runApp(const HabeshaGoDriverApp());
}

class HabeshaGoDriverApp extends StatelessWidget {
  const HabeshaGoDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HabeshaGo Driver',
      theme: ThemeData(colorSchemeSeed: const Color(0xFF19324A), useMaterial3: true),
      home: const DriverHome(),
    );
  }
}

class DriverHome extends StatelessWidget {
  const DriverHome({super.key});

  @override
  Widget build(BuildContext context) {
    final tasks = [
      'Go online or offline',
      'Accept, reject, pick up, and deliver orders',
      'Track earnings, float, and cash collected',
      'Use panic/support button',
      'Receive zone-based dispatch',
      'Complete training and night safety certification'
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('HabeshaGo Driver')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Driver operations', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          ...tasks.map((task) => Card(child: ListTile(leading: const Icon(Icons.delivery_dining), title: Text(task)))),
          const SizedBox(height: 12),
          FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.shield), label: const Text('Open safety support')),
        ],
      ),
    );
  }
}
