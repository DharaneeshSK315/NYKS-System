import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()),
      ],
      child: const NYKSApp(),
    ),
  );
}

class NYKSApp extends StatelessWidget {
  const NYKSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NYKS Attendance',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0D47A1)),
      ),
      home: Consumer<AuthService>(
        builder: (context, auth, _) {
          if (auth.token != null) {
            return HomeScreen();
          }
          return const LoginScreen();
        },
      ),
    );
  }
}
